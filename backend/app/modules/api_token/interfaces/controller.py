from typing import List

from fastapi import APIRouter, Depends, Query

from app.core.dependancies import get_current_user
from app.modules.api_token.application.service import AgentNoteService, ApiTokenService
from app.modules.api_token.interfaces.dependencies import (ApiCaller, api_token_caller, get_agent_note_service,
                                                           get_api_token_service)
from app.modules.api_token.interfaces.schemas import (AgentNote, AgentNoteAppendRequest, AgentNoteCreateRequest,
                                                      AgentNoteDetail, AgentNoteListItem, ApiTokenCreatedResponse,
                                                      ApiTokenCreateRequest, ApiTokenSchema)

# ---------------------------------------------------------------- 토큰 관리(설정 화면, 로그인 필요)

router = APIRouter(prefix="/api-tokens", tags=["API Tokens"])


@router.get("", response_model=List[ApiTokenSchema])
def list_tokens(user=Depends(get_current_user), service: ApiTokenService = Depends(get_api_token_service)):
    return service.list_tokens(user.pk)


@router.post("", response_model=ApiTokenCreatedResponse, status_code=201)
def issue_token(request: ApiTokenCreateRequest, user=Depends(get_current_user),
                service: ApiTokenService = Depends(get_api_token_service)):
    token, raw = service.issue_token(user.pk, request.name, request.scope)
    response = ApiTokenCreatedResponse.model_validate({**ApiTokenSchema.model_validate(token).model_dump(),
                                                       "token": raw})
    return response


@router.delete("/{token_id}", status_code=204)
def revoke_token(token_id: str, user=Depends(get_current_user),
                 service: ApiTokenService = Depends(get_api_token_service)):
    service.revoke_token(user.pk, token_id)


# ---------------------------------------------------------------- /api/v1 (API 토큰)

v1_router = APIRouter(prefix="/api/v1", tags=["Agent API v1"])


def _agent_note(service: AgentNoteService, note, **extra):
    return dict(id=note.hash_id, title=note.title or "", folder=service.folder_path_of(note.folder),
                url=service.note_url(note.hash_id), created_at=note.created_at, updated_at=note.updated_at, **extra)


@v1_router.post("/notes", response_model=AgentNote, status_code=201)
def create_note(request: AgentNoteCreateRequest, caller: ApiCaller = Depends(api_token_caller("write")),
                service: AgentNoteService = Depends(get_agent_note_service)):
    note = service.create_note(caller.user, caller.token, request.title, request.content, request.folder)
    return _agent_note(service, note)


@v1_router.post("/notes/{note_id}/append", response_model=AgentNote)
def append_to_note(note_id: str, request: AgentNoteAppendRequest,
                   caller: ApiCaller = Depends(api_token_caller("write")),
                   service: AgentNoteService = Depends(get_agent_note_service)):
    note = service.append_to_note(caller.user, caller.token, note_id, request.content)
    return _agent_note(service, note)


@v1_router.get("/notes", response_model=List[AgentNoteListItem])
def list_notes(q: str | None = Query(None, description="찾을 말. 비우면 최근에 고친 노트부터."),
               page: int = Query(1, ge=1), caller: ApiCaller = Depends(api_token_caller("read")),
               service: AgentNoteService = Depends(get_agent_note_service)):
    notes = service.list_notes(caller.user, q, page)
    return [_agent_note(service, note, snippet=service.snippet(note.content)) for note in notes]


@v1_router.get("/notes/{note_id}", response_model=AgentNoteDetail)
def get_note(note_id: str, caller: ApiCaller = Depends(api_token_caller("read")),
             service: AgentNoteService = Depends(get_agent_note_service)):
    note, markdown = service.get_note_markdown(caller.user, note_id)
    return _agent_note(service, note, content=markdown)


@v1_router.get("/folders", response_model=List[str])
def list_folders(caller: ApiCaller = Depends(api_token_caller("read")),
                 service: AgentNoteService = Depends(get_agent_note_service)):
    """폴더 경로 목록('업무/회의'). 노트를 만들 때 folder 에 그대로 넣으면 된다."""
    return service.folder_paths(caller.user)
