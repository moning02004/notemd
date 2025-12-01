from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship


class Group(BaseModel):
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # relationships
    users = relationship(
        "User",
        secondary="groupmember",
        back_populates="groups"
    )
    notes = relationship("Note", back_populates="group")


class User(BaseModel):
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)

    # relationships
    groups = relationship(
        "Group",
        secondary="user_group",
        back_populates="users"
    )
    notes = relationship("Note", back_populates="user")


class GroupMember(BaseModel):
    group_id = Column(String, ForeignKey("group.id"))
    user_id = Column(String, ForeignKey("user.id"))
    role = Column(String, default="owner")
