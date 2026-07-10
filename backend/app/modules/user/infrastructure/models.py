from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship


class User(BaseModel):
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_superuser = Column(Boolean, default=False)
    is_approval = Column(Boolean, default=False)

    # relationships
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", secondary="workspace_member", back_populates="users")
    preference = relationship("Preference", back_populates="user", uselist=False, cascade="all, delete-orphan")

    @property
    def user_hash(self):
        return self.hash_id
