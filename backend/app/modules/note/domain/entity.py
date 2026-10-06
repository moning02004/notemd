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
    # 노트가 든 폴더의 hash(없으면 None). 검색을 한 폴더 안으로 좁힐 때 거른다.
    folder: str | None
    user_hash: str | None
    is_deleted: bool
    created_at: str | None
    updated_at: str | None


def build_note_document(note) -> NoteDocument:
    """노트 한 건을 검색 색인 문서로 만든다.

    암호화한 노트는 본문을 색인에 넣지 않는다. 색인은 평문으로 보관되므로, 넣으면 DB 에서만 암호문이고
    검색 서버에는 본문이 그대로 남는다. 제목과 태그로는 계속 찾을 수 있다.
    """
    return NoteDocument(
        id=note.hash_id,
        title=note.title,
        content="" if note.is_encrypted else re.sub(r"<[^>]+>", "", note.content or ""),
        tags=[tag.keyword for tag in note.tags],
        folder=note.folder.hash_id if note.folder else None,
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
