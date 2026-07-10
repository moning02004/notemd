from typing import List

from fastapi import APIRouter, Depends

from app.core.dependancies import get_current_user, get_super_user, get_user_or_none
from app.modules.user.application.service import UserService
from app.modules.user.infrastructure.models import User
from app.modules.user.interfaces.dependencies import get_user_service
from app.modules.user.interfaces.schemas import ChangePasswordRequest, SignupSchema, UserCreateResponse, \
    UserInfoResponse
from app.modules.workspace.interfaces.schemas import WorkspaceInfoResponse

router = APIRouter(prefix="/users", tags=["User"])


@router.get("", response_model=List[UserInfoResponse])
def list_members(service: UserService = Depends(get_user_service), _: User = Depends(get_super_user)):
    user = service.list_members()
    return user


@router.post("", response_model=UserInfoResponse, status_code=201)
def create_user(request: SignupSchema, service: UserService = Depends(get_user_service),
                user: User = Depends(get_user_or_none)):
    user = service.create_user(user, request)
    return user


@router.get("/{user_hash}", response_model=UserInfoResponse)
def get_user_info(user_hash: str, service: UserService = Depends(get_user_service)):
    user = service.get_user_info(user_hash)
    return user


@router.get("/{user_hash}/workspaces", response_model=List[WorkspaceInfoResponse])
def get_workspaces_for_user(user_hash: str, service: UserService = Depends(get_user_service)):
    workspaces = service.get_workspaces_for_user(user_hash)
    return workspaces


@router.patch("/change-password", status_code=204)
def change_password(request: ChangePasswordRequest, user=Depends(get_current_user),
                    service: UserService = Depends(get_user_service)):
    service.change_password(user, request)


@router.delete("/{user_hash}", status_code=204)
def delete_user(user_hash: str, service: UserService = Depends(get_user_service), _: User = Depends(get_super_user)):
    service.delete_user(user_hash)
