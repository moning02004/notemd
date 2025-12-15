from jwt import ExpiredSignatureError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.jwt_util import jwt_manager


class NotExistsToken(Exception):
    def __init__(self, message="Token does not exist"):
        self.message = message
        super().__init__(self.message)


def get_user_id_from_token(token):
    if not token:
        raise NotExistsToken

    token = token.replace("Bearer ", "")
    payload = jwt_manager.decode_payload(token)
    return payload["user_id"]


class AuthTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = request.headers.get("Authorization")

        request.state.user_id = None
        try:
            request.state.user_id = get_user_id_from_token(token)
        except (ExpiredSignatureError, NotExistsToken):
            pass

        response = await call_next(request)
        return response
