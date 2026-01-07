import jwt
from fastapi import Depends, HTTPException
from fastapi_clean_archi.core.auth import hash_password
from fastapi_clean_archi.core.commons.service import Service
from starlette import status
from starlette.requests import Request

from app.core.config import settings
from app.core.jwt_util import jwt_manager
from app.core.session import get_db
from app.modules.user.domain.entity import UserEntity, UserSignupEntity
from app.modules.user.infrastructure.repository import UserRepository


def get_current_user(request: Request, db=Depends(get_db)):
    if not hasattr(request.state, "user_id") or request.state.user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다.")

    user = UserRepository(db).get_by_pk(request.state.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="유효하지 않은 사용자")
    return user


def get_user_or_none(request: Request, db=Depends(get_db)):
    if hasattr(request.state, "user_id") and request.state.user_id:
        return UserRepository(db).get_by_pk(request.state.user_id)
    return None


def verify_refresh_token(token):
    try:
        jwt_manager.decode_payload(token)
        return True
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return False


class UserService(Service):
    NotFoundUser = HTTPException(status_code=404, detail="계정을 찾을 수 없습니다.")
    InvalidToken = HTTPException(status_code=403, detail="토큰이 유효하지 않습니다.")

    def get_token_expires(self):
        refresh_token_expires = settings.REFRESH_TOKEN_EXPIRE_MINUTES
        number, number_type = int(refresh_token_expires[:-1]), str(refresh_token_expires[-1]).lower()
        if number_type == "d":
            return number * 60 * 60 * 24
        elif number_type == "h":
            return number * 60 * 60
        elif number_type == "m":
            return number * 60
        return 0

    def obtain_token(self, request):
        user = self.repository.get_by_username(request.username)
        if not user:
            raise self.NotFoundUser

        user_entity = UserEntity(id=user.pk, hashed_password=user.hashed_password)
        if not user_entity.check_password(request.password):
            raise self.NotFoundUser

        tokens = jwt_manager.create({"user_id": str(user.pk)})
        return tokens, user.pk

    def refresh_token(self, token):
        if not verify_refresh_token(token):
            raise self.InvalidToken

        payload = jwt_manager.decode_payload(token)
        new_tokens = jwt_manager.create({"user_id": payload["user_id"]})
        return new_tokens, int(payload["user_id"])

    def create_user(self, request):
        if self.repository.get_by_username(request.username):
            raise HTTPException(status_code=400, detail="이미 존재하는 사용자 이름입니다.")

        if request.password1 != request.password2:
            raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")

        user_entity = UserSignupEntity(username=request.username,
                                       hashed_password=hash_password(request.password1),
                                       name=request.name)
        user = self.repository.create_user(user_entity)
        return user

    def exists_user(self):
        return self.repository.exists_user()
