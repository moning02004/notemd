from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Boolean, DateTime, Table
from sqlalchemy.orm import relationship

workspace_note = Table(
    "workspace_note",
    BaseModel.metadata,
    Column("note_id", ForeignKey("note.id"), primary_key=True),
    Column("workspace_id", ForeignKey("workspace.id"), primary_key=True),
)


class Note(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    title = Column(String)
    content = Column(Text)
    is_public = Column(Boolean, default=False)
    is_protected = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # relationships
    user = relationship("User", back_populates="notes")
    tags = relationship("Tag", secondary="notetag", back_populates="notes")
    workspaces = relationship("Workspace", secondary="workspace_note", back_populates="notes")

    snapshot = relationship("NoteSnapshot", back_populates="note", uselist=False, cascade="all, delete-orphan")

    @property
    def user_hash(self):
        return self.user.hash_id

    @property
    def owner_name(self):
        return self.user.name

    @property
    def is_shared(self):
        return len(self.workspaces) > 0


class NoteSnapshot(BaseModel):
    note_id = Column(Integer, ForeignKey("note.id", ondelete="CASCADE"), nullable=False)
    description = Column(String)

    title = Column(String)
    content = Column(Text)

    # relationships
    note = relationship("Note", back_populates="snapshot")
