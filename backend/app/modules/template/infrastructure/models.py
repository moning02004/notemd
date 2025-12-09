from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, Integer, ForeignKey, String, Text
from sqlalchemy.orm import relationship


class Template(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    name = Column(String, nullable=False)
    description = Column(String, default="")

    title = Column(String)
    content = Column(Text)

    # relationships
    user = relationship("User", back_populates="templates")
