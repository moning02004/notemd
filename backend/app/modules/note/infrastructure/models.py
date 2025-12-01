from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship


class Note(BaseModel):
    group_id = Column(Integer, ForeignKey("group.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    title = Column(String)
    content = Column(Text)
    is_public = Column(Boolean, default=False)
    edit_permission = Column(Integer, default=100)  # e.g., owner, group_members

    # relationships
    owner = relationship("User", back_populates="notes")
    group = relationship("Group", back_populates="notes")


class Template(BaseModel):
    name = Column(String)
    title = Column(String)
    content = Column(Text)
