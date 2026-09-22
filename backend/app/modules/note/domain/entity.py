import re
from dataclasses import dataclass


@dataclass
class NoteEntity:
    user_id: int
    title: str
    content: str
    is_public: bool = False
    folder_id: int | None = None


@dataclass
class NoteDocument:
    id: str
    title: str
    content: str
    tags: list[str]
    user_hash: str | None
    is_deleted: bool
    created_at: str | None
    updated_at: str | None


def build_note_document(note) -> NoteDocument:
    """노트 한 건을 검색 색인 문서로 만든다.

    본문은 DB 에 암호문으로 들어가 있을 수 있으나, 색인에는 태그를 벗긴 평문이 들어간다.
    호출부는 복호화가 끝난 note 를 넘겨야 한다.
    """
    return NoteDocument(
        id=note.hash_id,
        title=note.title,
        content=re.sub(r"<[^>]+>", "", note.content or ""),
        tags=[tag.keyword for tag in note.tags],
        user_hash=note.user.hash_id,
        is_deleted=note.deleted_at is not None,
        created_at=note.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        updated_at=note.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
    )


@dataclass
class DownloadResult:
    content: bytes
    media_type: str
    filename: str


@dataclass
class SnapshotEntity:
    hash_id: str
    description: str

    title: str
    content: str

    created_at: int | None
    updated_at: int | None

    @classmethod
    def from_orm(cls, snapshot):
        return cls(
            hash_id=snapshot.hash_id,
            description=snapshot.description,
            title=snapshot.title,
            content=snapshot.content,
            created_at=snapshot.created_at,
            updated_at=snapshot.updated_at,
        )
