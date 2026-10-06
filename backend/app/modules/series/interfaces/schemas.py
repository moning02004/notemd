from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel


class SeriesCreateRequest(BaseModel):
    title: str
    description: str | None = None
    # 고른 순서가 곧 시리즈 안의 순서다.
    note_hashes: List[str]


class SeriesUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    # 보내면 노트와 순서를 통째로 갈아 끼운다. 생략하면 그대로 둔다.
    note_hashes: List[str] | None = None
    # 링크로 공개할지. 켜면 링크가 있는 누구나 이 시리즈와 그 안의 노트를 읽는다.
    is_public: bool | None = None


class SeriesDownloadRequest(BaseModel):
    file_format: Literal["md", "pdf"] = "pdf"


class SeriesNoteSchema(BaseModel):
    hash_id: str
    title: str


class SeriesSchema(BaseModel):
    hash_id: str
    title: str
    description: str
    note_count: int
    is_public: bool
    updated_at: datetime


class SeriesDetailSchema(SeriesSchema):
    notes: List[SeriesNoteSchema]


class NoteSeriesSchema(BaseModel):
    """노트 화면이 '시리즈의 몇 번째인지' 와 앞·뒤 노트를 그리는 데 쓴다."""
    hash_id: str
    title: str
    # 공개된 시리즈에 든 노트는 시리즈 링크로 읽힐 수 있다. 노트 화면이 주인에게 알려준다.
    is_public: bool
    position: int
    total: int
    prev: SeriesNoteSchema | None
    next: SeriesNoteSchema | None


class PublicSeriesNoteSchema(BaseModel):
    hash_id: str
    # 비밀번호가 걸린 노트는 제목을 비워 보낸다.
    title: str
    is_locked: bool


class PublicSeriesSchema(BaseModel):
    """링크로 공개한 시리즈를 로그인 없이 읽는 모양. 주인만 아는 것(고친 날 등)은 싣지 않는다."""
    hash_id: str
    title: str
    description: str
    owner_name: str
    notes: List[PublicSeriesNoteSchema]
