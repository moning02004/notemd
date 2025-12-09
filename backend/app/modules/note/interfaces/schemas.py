from datetime import datetime

from fastapi import Query
from pydantic import BaseModel, ConfigDict


class QueryParams(BaseModel):
    keyword: str | None = Query(None, min_length=2)
    limit: int = Query(10, ge=1, le=100)


def get_query_params(keyword: str = Query(None), limit: int = Query(10)) -> QueryParams:
    return QueryParams(keyword=keyword, limit=limit)


class NoteListSchema(BaseModel):
    title: str
    content: str
    is_public: bool
    hash_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoteCreateSchema(BaseModel):
    hash_id: str

    model_config = ConfigDict(from_attributes=True)


class NoteDetailSchema(BaseModel):
    title: str
    content: str
    is_public: bool

    model_config = ConfigDict(from_attributes=True)


class NoteUpdateRequest(BaseModel):
    title: str
    content: str
    is_public: bool
