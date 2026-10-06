from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------- 토큰 관리(설정 화면)

class ApiTokenCreateRequest(BaseModel):
    name: str
    scope: Literal["write", "read_write"] = "write"


class ApiTokenSchema(BaseModel):
    hash_id: str
    name: str
    prefix: str
    scope: str
    created_at: datetime
    last_used_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ApiTokenCreatedResponse(ApiTokenSchema):
    # 토큰 원문. 이 응답에서 한 번만 보여준다.
    token: str


# ---------------------------------------------------------------- /api/v1 (에이전트)

class AgentNoteCreateRequest(BaseModel):
    title: str = ""
    content: str = Field("", description="마크다운 본문. 체크리스트(- [x])·접기(<details>)·표도 읽는다.")
    folder: str | None = Field(None, description="'업무/회의' 같은 폴더 경로. 없는 폴더는 만든다. 비우면 미분류.")


class AgentNoteAppendRequest(BaseModel):
    content: str = Field(..., description="노트 끝에 덧붙일 마크다운.")


class AgentNoteReplaceRequest(BaseModel):
    content: str = Field(..., description="노트 본문을 통째로 바꿀 마크다운.")
    title: str | None = Field(None, description="새 제목. 생략하면 제목은 그대로 둔다.")


class AgentNote(BaseModel):
    id: str
    title: str
    folder: str | None
    url: str
    created_at: datetime
    updated_at: datetime


class AgentNoteDetail(AgentNote):
    content: str = Field(..., description="마크다운 본문")


class AgentNoteListItem(AgentNote):
    snippet: str
