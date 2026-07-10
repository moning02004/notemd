from fastapi_clean_archi.core.commons.repository import Repository

from app.modules.user.infrastructure.models import User


class UserRepository(Repository):
    DB_MODEL = User

    def find_user_by_username(self, username: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.username == username).first()
        return instance

    def get_user_by_user_hash(self, user_hash: str):
        user = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.hash_id == user_hash).first()
        return user

    def find_members(self):
        members = self.db.query(User).filter(User.is_superuser.is_(False)).all()
        return members

    def create_user(self, **columns) -> User:
        new_user = User(**columns)
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    def exists_user(self) -> bool:
        return self.db.query(self.DB_MODEL).first() is not None

    def update_password(self, user: User, hashed_password: str):
        user.hashed_password = hashed_password
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user: User):
        self.db.delete(user)
        self.db.commit()
