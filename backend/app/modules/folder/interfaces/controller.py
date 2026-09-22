from fastapi import APIRouter, Depends

from app.core.dependancies import get_current_user
from app.modules.folder.application.service import FolderService
from app.modules.folder.interfaces.dependencies import get_folder_service
from app.modules.folder.interfaces.schemas import (FolderCreateRequest, FolderSchema, FolderTreeResponse,
                                                   FolderUpdateRequest, FoldersFromTagsRequest,
                                                   NoteMoveRequest)

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.get("", response_model=FolderTreeResponse)
def list_folders(user=Depends(get_current_user), service: FolderService = Depends(get_folder_service)):
    return FolderTreeResponse(
        folders=service.list_folders(user_id=user.pk),
        unfiled_count=service.count_unfiled(user_id=user.pk),
    )


@router.post("", response_model=FolderSchema, status_code=201)
def create_folder(request: FolderCreateRequest, user=Depends(get_current_user),
                  service: FolderService = Depends(get_folder_service)):
    return service.create_folder(user_id=user.pk, request=request)


@router.patch("/notes", response_model=list[str])
def move_notes(request: NoteMoveRequest, user=Depends(get_current_user),
               service: FolderService = Depends(get_folder_service)):
    """노트 여러 개를 한 폴더로 옮긴다. folder 가 null 이면 미분류로 보낸다."""
    return service.move_notes(user_id=user.pk, note_hashes=request.note_hashes, folder_hash=request.folder)


@router.post("/from-tags")
def create_folders_from_tags(request: FoldersFromTagsRequest, user=Depends(get_current_user),
                             service: FolderService = Depends(get_folder_service)):
    """쓰고 있던 태그를 폴더로 승격시키고 미분류 노트를 한 번에 옮긴다."""
    return service.create_from_tags(user_id=user.pk, keywords=request.keywords)


@router.patch("/{folder_hash}", response_model=FolderSchema)
def update_folder(folder_hash: str, request: FolderUpdateRequest, user=Depends(get_current_user),
                  service: FolderService = Depends(get_folder_service)):
    return service.update_folder(user_id=user.pk, folder_hash=folder_hash, request=request)


@router.delete("/{folder_hash}")
def delete_folder(folder_hash: str, user=Depends(get_current_user),
                  service: FolderService = Depends(get_folder_service)):
    trashed = service.delete_folder(user_id=user.pk, folder_hash=folder_hash)
    return {"trashed_note_count": trashed}
