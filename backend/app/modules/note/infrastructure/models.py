from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Boolean, DateTime, LargeBinary, Table
from sqlalchemy.orm import relationship

workspace_note = Table(
    "workspace_note",
    BaseModel.metadata,
    Column("note_id", ForeignKey("note.id"), primary_key=True),
    Column("workspace_id", ForeignKey("workspace.id"), primary_key=True),
)

# 본문의 노트 링크(<a data-note>)를 저장할 때마다 옮겨 적는 표. "이 노트를 가리키는 노트"(백링크)를 찾는 데 쓴다.
# 본문은 암호화돼 있을 수 있어 DB 에서 긁을 수 없으므로, 평문을 가진 저장 시점에 따로 적어 둔다.
# 어느 쪽 노트든 영구 삭제되면 함께 지워진다.
note_link = Table(
    "note_link",
    BaseModel.metadata,
    Column("source_note_id", ForeignKey("note.id", ondelete="CASCADE"), primary_key=True),
    Column("target_note_id", ForeignKey("note.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Note(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    title = Column(String)
    content = Column(Text)
    is_public = Column(Boolean, default=False)
    is_protected = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    password = Column(String, nullable=True)
    is_encrypted = Column(Boolean, default=False)

    # 공동 편집(4.0)의 Y 문서(Yjs 상태). 비어 있으면 처음 열 때 content(HTML)로 만든다.
    # content 는 검색·내보내기·API·백링크가 읽는 사본으로 계속 채운다. 암호화 노트는 이것도 암호화해 둔다.
    ydoc = Column(LargeBinary, nullable=True)

    # 폴더가 없으면 '미분류'. 폴더를 지우면 SET NULL 로 비워져 복구 시 미분류로 돌아간다.
    folder_id = Column(Integer, ForeignKey("folder.id", ondelete="SET NULL"), nullable=True, index=True)

    # relationships
    user = relationship("User", back_populates="notes")
    folder = relationship("Folder", back_populates="notes")
    tags = relationship("Tag", secondary="notetag", back_populates="notes")
    workspaces = relationship("Workspace", secondary="workspace_note", back_populates="notes")

    snapshots = relationship("NoteSnapshot", back_populates="note", cascade="all, delete-orphan")

    @property
    def user_hash(self):
        return self.user.hash_id

    @property
    def is_password(self):
        return (self.password or "") != ""

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
    note = relationship("Note", back_populates="snapshots")
