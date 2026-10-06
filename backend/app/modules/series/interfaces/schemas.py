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
    updated_at: datetime


class SeriesDetailSchema(SeriesSchema):
    notes: List[SeriesNoteSchema]


class NoteSeriesSchema(BaseModel):
    """노트 화면이 '시리즈의 몇 번째인지' 와 앞·뒤 노트를 그리는 데 쓴다."""
    hash_id: str
    title: str
    position: int
    total: int
    prev: SeriesNoteSchema | None
    next: SeriesNoteSchema | None
