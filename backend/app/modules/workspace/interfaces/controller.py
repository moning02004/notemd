from typing import List

from fastapi import APIRouter, Depends

from app.core.dependancies import get_super_user, get_current_user
from app.modules.note.interfaces.schemas import NoteListSchema
from app.modules.workspace.application.service import WorkspaceService
from app.modules.workspace.interfaces.dependancies import get_workspace_serivce
from app.modules.workspace.interfaces.schemas import WorkspaceInfoResponse, WorkspaceCreateRequest, \
    WorkspaceUserResponse

router = APIRouter(prefix="/workspaces", tags=[])


@router.get("", response_model=List[WorkspaceInfoResponse])
def list_workspace(user=Depends(get_super_user), service: WorkspaceService = Depends(get_workspace_serivce)):
    workspaces = service.list_workspace(user_hash=user.hash_id)
    return workspaces


@router.post("", response_model=WorkspaceInfoResponse, status_code=201)
def create_workspace(request: WorkspaceCreateRequest, user=Depends(get_super_user),
                     service: WorkspaceService = Depends(get_workspace_serivce)):
    workspaces = service.create_workspace(user=user, request=request)
    return workspaces


@router.delete("/{workspace_hash}", status_code=204)
def delete_workspace(workspace_hash: str, _=Depends(get_super_user),
                     service: WorkspaceService = Depends(get_workspace_serivce)):
    service.delete_workspace(workspace_hash)


@router.get("/{workspace_hash}/notes", response_model=List[NoteListSchema])
def get_workspace_notes(workspace_hash, user=Depends(get_current_user),
                        service: WorkspaceService = Depends(get_workspace_serivce)):
    notes = service.get_workspace_notes(user=user, hash_id=workspace_hash)
    return notes


@router.get("/{workspace_hash}/users", response_model=List[WorkspaceUserResponse])
def get_workspace_users(workspace_hash: str, _=Depends(get_super_user),
                        service: WorkspaceService = Depends(get_workspace_serivce)):
    results = service.get_workspace_users(workspace_hash)
    return results


@router.post("/{workspace_hash}/users/{user_hash}", response_model=WorkspaceUserResponse, status_code=201)
def add_into_workspace(workspace_hash: str, user_hash: str, _=Depends(get_super_user),
                       service: WorkspaceService = Depends(get_workspace_serivce)):
    result = service.add_into_workspace(workspace_hash=workspace_hash, user_hash=user_hash)
    return result


@router.delete("/{workspace_hash}/users/{user_hash}", status_code=204)
def delete_from_workspace(workspace_hash: str, user_hash: str, _=Depends(get_super_user),
                          service: WorkspaceService = Depends(get_workspace_serivce)):
    service.delete_from_workspace(workspace_hash=workspace_hash, user_hash=user_hash)
