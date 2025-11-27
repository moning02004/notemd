from fastapi import Depends, HTTPException
from starlette import status
from starlette.requests import Request

from app.core.commons.service import Service
from app.core.db.session import get_db
from app.modules.user.infrastructure.repository import UserRepository


def get_current_user(request: Request, db=Depends(get_db)):
    if request.state.user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인 필요")

    user = UserRepository(db).get_by_pk(request.state.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="유효하지 않은 사용자")
    return user


def get_user_or_none(request: Request, db=Depends(get_db)):
    if request.state.user_id:
        return UserRepository(db).get_by_pk(request.state.user_id)
    return None


class UserService(Service):
    pass
