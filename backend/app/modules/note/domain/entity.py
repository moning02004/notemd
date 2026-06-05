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
    created_at: int | None
    updated_at: int | None
