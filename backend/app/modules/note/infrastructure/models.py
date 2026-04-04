from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship



class Note(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    title = Column(String)
    content = Column(Text)
    is_public = Column(Boolean, default=False)
    is_protected = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    # relationships
    user = relationship("User", back_populates="notes")
    tags = relationship("Tag", secondary="notetag", back_populates="notes")
