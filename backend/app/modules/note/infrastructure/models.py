from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Boolean, DateTime, LargeBinary, Table, Index, text
from sqlalchemy.orm import relationship

workspace_note = Table(
    "workspace_note",
    BaseModel.metadata,
    Column("note_id", ForeignKey("note.id"), primary_key=True),
    Column("workspace_id", ForeignKey("workspace.id"), primary_key=True),
    # 기본 키는 (note_id, workspace_id) 라 워크스페이스 쪽에서 찾을 때(공유 노트 목록)는 따로 둔다.
    Index("ix_workspace_note_workspace_id", "workspace_id"),
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


# 목록·개수는 늘 '한 사람의, 휴지통에 없는 노트' 를 본다. 그 조건만 담은 부분 인덱스라 휴지통 노트는 들지 않고,
# 정렬 열까지 담아 첫 쪽 20개를 인덱스 순서대로 읽고 멈춘다(전부 읽어 정렬하지 않는다).
LIVE = text("deleted_at IS NULL")
TRASHED = text("deleted_at IS NOT NULL")


class Note(BaseModel):
    __table_args__ = (
        # 목록 기본(최근 고친 순)과 태그·전체 노트 수. id 를 함께 담아 태그 집계(notetag 와 조인)도 표를 읽지 않는다.
        Index("ix_note_user_updated_live", "user_id", "updated_at", postgresql_where=LIVE, sqlite_where=LIVE,
              postgresql_include=["id"]),
        # 만든 순 목록.
        Index("ix_note_user_created_live", "user_id", "created_at", postgresql_where=LIVE, sqlite_where=LIVE),
        # 폴더별 노트 수(인덱스만 읽는다), 미분류 수·목록, 한 폴더 목록.
        Index("ix_note_user_folder_live", "user_id", "folder_id", "updated_at",
              postgresql_where=LIVE, sqlite_where=LIVE),
        # 휴지통 목록(지운 순).
        Index("ix_note_user_trashed", "user_id", "deleted_at", postgresql_where=TRASHED, sqlite_where=TRASHED),
    )

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
    # 노트 하나의 스냅샷 목록(최근 것부터)과 공동 편집 저장 때마다 보는 마지막 스냅샷.
    __table_args__ = (Index("ix_notesnapshot_note_created", "note_id", "created_at"),)

    note_id = Column(Integer, ForeignKey("note.id", ondelete="CASCADE"), nullable=False)
    description = Column(String)

    title = Column(String)
    content = Column(Text)

    # relationships
    note = relationship("Note", back_populates="snapshots")
