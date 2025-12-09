from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship


class Note(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    title = Column(String)
    content = Column(Text)
    is_public = Column(Boolean, default=False)

    # relationships
    user = relationship("User", back_populates="notes")


class Template(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    name = Column(String, nullable=False)
    description = Column(String, default="")

    title = Column(String)
    content = Column(Text)

    # relationships
    user = relationship("User", back_populates="templates")
