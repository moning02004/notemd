from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Integer, Boolean, LargeBinary, ForeignKey, false
from sqlalchemy.orm import relationship


class User(BaseModel):
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_superuser = Column(Boolean, default=False)
    is_approval = Column(Boolean, default=False)
    # 관리자가 만든 계정은 임시 비밀번호로 시작한다. 처음 로그인하면 새 비밀번호로 바꾸기 전까지 앱을 쓸 수 없다.
    # 이 칸이 생기기 전의 계정은 false 로 둔다(바꾸고 싶은 사람은 내 정보에서 바꾼다).
    must_change_password = Column(Boolean, nullable=False, default=False, server_default=false())

    # relationships
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", secondary="workspace_member", back_populates="users")
    preference = relationship("Preference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    key = relationship("UserKey", back_populates="user", uselist=False, cascade="all, delete-orphan",
                       passive_deletes=True,
                       lazy="selectin")

    @property
    def user_hash(self):
        return self.hash_id


class UserKey(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False)
    key_blob = Column(LargeBinary, nullable=False)
    kek_version = Column(Integer, nullable=False, index=True)

    user = relationship("User", back_populates="key")
