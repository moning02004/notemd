from fastapi_clean_archi.core.commons.repository import Repository

from app.modules.user.infrastructure.models import User


class UserRepository(Repository):
    DB_MODEL = User

    def get_by_username(self, username: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.username == username).first()
        return instance

    def create_user(self, user_entity) -> User:
        new_user = self.DB_MODEL(username=user_entity.username,
                                 hashed_password=user_entity.hashed_password,
                                 name=user_entity.name)
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    def exists_user(self) -> bool:
        return self.db.query(self.DB_MODEL).first() is not None