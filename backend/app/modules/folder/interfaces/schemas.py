from typing import List

from pydantic import BaseModel, ConfigDict


class FolderCreateRequest(BaseModel):
    name: str
    parent: str | None = None


class FolderUpdateRequest(BaseModel):
    name: str | None = None
    # 생략과 null 을 구분해야 한다. null 은 '최상위로 옮긴다'는 뜻이므로
    # 서비스에서 model_fields_set 으로 판별한다.
    parent: str | None = None


class FolderNodeSchema(BaseModel):
    hash_id: str
    name: str
    parent_hash: str | None
    depth: int
    path: str
    note_count: int
    total_count: int
    children: List["FolderNodeSchema"] = []

    model_config = ConfigDict(from_attributes=True)


class FolderTreeResponse(BaseModel):
    folders: List[FolderNodeSchema]
    # 폴더가 정해지지 않은 노트 수. 기존 노트가 전부 여기서 시작한다.
    unfiled_count: int


class FolderSchema(BaseModel):
    hash_id: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class FoldersFromTagsRequest(BaseModel):
    keywords: List[str]


class NoteMoveRequest(BaseModel):
    note_hashes: List[str]
    folder: str | None = None
