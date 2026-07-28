from dataclasses import dataclass


@dataclass
class NoteEntity:
    user_id: int
    title: str
    content: str
    is_public: bool = False


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
