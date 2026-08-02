import re
from dataclasses import dataclass
from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, ConfigDict, field_serializer


@dataclass
class QueryParams:
    keyword: str | None = Query(None)
    sort: str | None = Query("-updated_at")
    tag: str | None = Query(None)
    is_deleted: int = Query(0)
    page: int = Query(1, ge=1)


class NoteListSchema(BaseModel):
    title: str
    content: str
    owner_name: str
    is_public: bool
    is_protected: bool
    is_shared: bool
    is_encrypted: bool | None
    is_password: bool
    hash_id: str
    created_at: datetime
    tags: list = []

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("tags")
    def serialize_tags(self, value, _info):
        return [x.keyword for x in value]

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

    @field_serializer("is_encrypted")
    def serialize_is_encrypted(self, value, _info):
        return value or False


class NoteCreateSchema(BaseModel):
    hash_id: str

    model_config = ConfigDict(from_attributes=True)


class NoteDetailSchema(BaseModel):
    title: str
    content: str
    user_hash: str
    is_public: bool
    is_protected: bool
    is_encrypted: bool | None
    password: str | None
    is_password: bool
    tags: list = []
    workspaces: list = []

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("tags")
    def serialize_tags(self, value, _info):
        return [x.keyword for x in value]

    @field_serializer("workspaces")
    def serialize_workspaces(self, value, _info):
        return [{"hashId": x.hash_id, "name": x.name} for x in value]

    @field_serializer("is_encrypted")
    def serialize_is_encrypted(self, value, _info):
        return value or False


class NoteRequest(BaseModel):
    password: str | None = None


class NoteUpdateRequest(BaseModel):
    title: str = None
    content: str = None
    is_public: bool = None
    is_protected: bool = None
    is_encrypted: bool = None
    password: str | None = None
    tags: list[str] = None
    workspaces: list[str] = None


class NoteHashesRequest(BaseModel):
    note_hashes: List[str]


class DefaultNoteRequest(BaseModel):
    title: str
    content: str


class SnapshotRequest(BaseModel):
    description: str = None


class NoteSnapshotSchema(BaseModel):
    hash_id: str
    description: str | None
    title: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime, _info):
        return value.strftime("%Y-%m-%d %H:%M")

    # @field_serializer('content')
    # def serialize_content(self, value: str, _info):
    #     value = re.sub(r'\n{2,}', '\n', value)
    #     values = value.split("\n")
    #     for index in range(len(values)):
    #         if values[index] == "<br />":
    #             values[index] = "\n"
    #         elif "<br />" in values[index]:
    #             values[index] = values[index].replace("<br />", "--")
    #
    #     value = re.sub(r'\n{3,}', '\n\n', "\n".join(values))
    #     return value.strip()
