from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship


class Group(BaseModel):
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # relationships
    users = relationship("GroupMember", back_populates="group")
    notes = relationship("Note", back_populates="group")


class User(BaseModel):
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)

    # relationships
    groups = relationship("GroupMember", back_populates="user")
    notes = relationship("Note", back_populates="owner")


class GroupMember(BaseModel):
    group_id = Column(String, ForeignKey("group.id"))
    user_id = Column(String, ForeignKey("user.id"))
    role = Column(String, default="owner")

    # relationships
    user = relationship("User", back_populates="groups")
    group = relationship("Group", back_populates="users")

