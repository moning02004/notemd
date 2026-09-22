import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Literal

from fastapi import Query
from pydantic import BaseModel, ConfigDict, field_serializer


@dataclass
class QueryParams:
    keyword: str | None = Query(None)
    sort: str | None = Query("-updated_at")
    tag: str | None = Query(None)
    is_deleted: int = Query(0)
    page: int = Query(1, ge=1)
    folder: str | None = Query(None)
    # 하위 폴더 노트까지 함께 보여줄지. 폴더 화면의 토글과 1:1 로 대응한다.
    include_sub: int = Query(0)
    # 폴더가 지정되지 않은 노트만. 정리 모드의 '미분류' 화면이 쓴다.
    unfiled: int = Query(0)


class NoteListSchema(BaseModel):
    title: str
    content: str
    user_hash: str
    owner_name: str
    is_public: bool
    is_protected: bool
    is_shared: bool
    is_encrypted: bool | None
    is_password: bool
    hash_id: str
    created_at: datetime
    deleted_at: datetime | None
    tags: list = []
    folder: object | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("folder")
    def serialize_folder(self, value, _info):
        if value is None:
            return None
        return {"hashId": value.hash_id, "name": value.name}


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

    @field_serializer('deleted_at')
    def serialize_deleted_at(self, value: datetime, _info):
        return value and value.strftime("%Y-%m-%d %H:%M")

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
    is_editable: bool
    tags: list = []
    workspaces: list = []
    folder: object | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("folder")
    def serialize_folder(self, value, _info):
        if value is None:
            return None
        return {"hashId": value.hash_id, "name": value.name}


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
    title: str | None = None
    content: str | None = None
    is_public: bool | None = None
    is_protected: bool | None = None
    is_encrypted: bool | None = None
    password: str | None | None = None
    tags: list[str] | None = None
    workspaces: list[str] | None = None
    is_first_edit: bool | None = None
    # 생략과 null 을 구분한다. null 은 미분류로 옮기라는 뜻이다.
    folder: str | None = None


class NoteCreateRequest(BaseModel):
    """새 노트를 특정 폴더에서 만들 때 쓴다. 본문 없이 폴더만 받는다."""
    folder: str | None = None


class NoteHashesRequest(BaseModel):
    note_hashes: List[str]


class NoteDownloadRequest(NoteHashesRequest):
    file_format: Literal["md", "pdf"] = "md"


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
