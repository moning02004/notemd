from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, ForeignKey, Index, String, Table
from sqlalchemy.orm import relationship

notetag = Table(
    "notetag",
    BaseModel.metadata,
    Column("note_id", ForeignKey("note.id"), primary_key=True),
    Column("tag_id", ForeignKey("tag.id"), primary_key=True),
    # 기본 키는 (note_id, tag_id) 라 태그 쪽에서 찾을 때(태그로 거른 목록)는 따로 둔다.
    Index("ix_notetag_tag_id", "tag_id"),
)


class Tag(BaseModel):
    keyword = Column(String, nullable=False, unique=True)

    notes = relationship("Note", secondary="notetag", back_populates="tags")
