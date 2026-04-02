from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import relationship

notetag = Table(
    "notetag",
    BaseModel.metadata,
    Column("note_id", ForeignKey("note.id"), primary_key=True),
    Column("tag_id", ForeignKey("tag.id"), primary_key=True),
)


class Tag(BaseModel):
    keyword = Column(String, nullable=False, unique=True)

    notes = relationship("Note", secondary="notetag", back_populates="tags")
