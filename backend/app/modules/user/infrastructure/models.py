from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, ForeignKey, Integer
from sqlalchemy.orm import relationship


class User(BaseModel):
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)

    # relationships
    notes = relationship("Note", back_populates="user")
    templates = relationship("Template", back_populates="user")
