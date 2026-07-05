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
    snapshot = relationship("NoteSnapshot", back_populates="note", uselist=False)


class NoteSnapshot(BaseModel):
    note_id = Column(Integer, ForeignKey("note.id"), nullable=False)
    name = Column(String)
    description = Column(String)

    title = Column(String)
    content = Column(Text)

    # relationships
    note = relationship("Note", back_populates="snapshot")
