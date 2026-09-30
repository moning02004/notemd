from jwt import InvalidTokenError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.jwt_util import jwt_manager


class NotExistsToken(Exception):
    def __init__(self, message="Token does not exist"):
        self.message = message
        super().__init__(self.message)


def get_user_hash_from_token(token):
    if not token:
        raise NotExistsToken

    token = token.replace("Bearer ", "")
    # 개인 API 토큰(mdn_…)은 로그인 토큰이 아니다. /api/v1 의 의존성이 따로 확인한다.
    if token.startswith("mdn_"):
        raise NotExistsToken
    payload = jwt_manager.decode_payload(token)
    return payload["user_hash"]


class AuthTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = request.headers.get("Authorization")

        request.state.user_hash = None
        try:
            request.state.user_hash = get_user_hash_from_token(token)
        # 만료된 토큰뿐 아니라 JWT 가 아닌 값도 '로그인하지 않음' 으로 본다. 예전에는 500 이 났다.
        except (InvalidTokenError, NotExistsToken):
            pass

        response = await call_next(request)
        return response
