from dataclasses import dataclass


@dataclass
class NoteEntity:
    user_id: int
    title: str
    content: str
    is_public: bool = False