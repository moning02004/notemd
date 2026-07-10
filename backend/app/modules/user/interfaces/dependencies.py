from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.session import get_db
from app.modules.user.application.service import UserService
from app.modules.user.infrastructure.repository import UserRepository


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    repository = UserRepository(db)
    return UserService(repository)
