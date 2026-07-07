from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.orm import relationship


class Note(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    title = Column(String)
    content = Column(Text)
    is_public = Column(Boolean, default=False)
    is_protected = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # relationships
    user = relationship("User", back_populates="notes")
    tags = relationship("Tag", secondary="notetag", back_populates="notes")
    snapshot = relationship("NoteSnapshot", back_populates="note", uselist=False, cascade="all, delete-orphan")


class NoteSnapshot(BaseModel):
    note_id = Column(Integer, ForeignKey("note.id", ondelete="CASCADE"), nullable=False)
    description = Column(String)

    title = Column(String)
    content = Column(Text)

    # relationships
    note = relationship("Note", back_populates="snapshot")
