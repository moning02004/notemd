from fastapi import Depends, HTTPException
from starlette import status
from starlette.requests import Request

from app.core.session import get_db
from app.modules.user.infrastructure.repository import UserRepository


def get_user_or_none(request: Request, db=Depends(get_db)):
    user_hash = getattr(request.state, "user_hash", None)
    if not user_hash:
        return None
    return UserRepository(db).get_user_by_user_hash(user_hash)


def get_current_user(user=Depends(get_user_or_none)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다.")
    return user


def get_super_user(user=Depends(get_current_user)):
    if not user.is_superuser:
        raise HTTPException(status_code=403, detail="최고 관리자 권한이 필요합니다.")
    return user
