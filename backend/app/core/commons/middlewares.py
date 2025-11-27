from jwt import ExpiredSignatureError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.manage_jwt import decode_jwt
from app.modules.user.domain.exceptions import NotExistsToken


def get_user_id_from_token(token):
    if not token:
        raise NotExistsToken

    token = token.replace("Bearer ", "")
    payload = decode_jwt(token)
    return payload["user_id"]


class AuthTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = request.headers.get("Authorization")

        try:
            request.state.user_id = get_user_id_from_token(token)
        except (ExpiredSignatureError, NotExistsToken):
            request.state.user_id = None

        response = await call_next(request)
        return response
