import re
from datetime import datetime

from fastapi import Query
from pydantic import BaseModel, ConfigDict, field_serializer


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

    @field_serializer('content')
    def serialize_content(self, value: str, _info):
        value = re.sub(r'\n{2,}', '\n', value)
        values = value.split("\n")
        for index in range(len(values)):
            if values[index] == "<br />":
                values[index] = "\n"
            elif "<br />" in values[index]:
                values[index] = values[index].replace("<br />", "--")

        value = re.sub(r'\n{3,}', '\n\n', "\n".join(values))
        return value.strip()

    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime, _info):
        return value.strftime("%Y-%m-%d %H:%M")


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
