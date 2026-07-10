from fastapi import HTTPException
from fastapi_clean_archi.core.auth import hash_password
from fastapi_clean_archi.core.commons.service import Service

from app.core.jwt_util import jwt_manager, verify_refresh_token
from app.modules.user.domain.entity import UserEntity
from app.modules.workspace.domain.entity import WorkspaceEntity
from app.modules.workspace.infrastructure.repository import WorkspaceRepository


class UserService(Service):
    NotFoundUser = HTTPException(status_code=404, detail="계정을 찾을 수 없습니다.")
    InvalidToken = HTTPException(status_code=403, detail="토큰이 유효하지 않습니다.")

    def obtain_token(self, request):
        user = self.repository.find_user_by_username(request.username)
        if not user:
            raise self.NotFoundUser

        user_entity = UserEntity(pk=user.pk, user_hash=user.hash_id, hashed_password=user.hashed_password)
        if not user_entity.check_password(request.password):
            raise self.NotFoundUser

        tokens = jwt_manager.create({"user_hash": user_entity.user_hash})
        return tokens, user_entity.user_hash

    def refresh_token(self, token):
        if not verify_refresh_token(token):
            raise self.InvalidToken

        payload = jwt_manager.decode_payload(token)
        user = self.repository.get_user_by_user_hash(payload["user_hash"])
        if not user:
            raise self.NotFoundUser

        new_tokens = jwt_manager.create({"user_hash": user.hash_id})
        return new_tokens, user.hash_id

    def list_members(self):
        return self.repository.find_members()

    def create_user(self, user, request):
        if user and not user.is_superuser:
            raise self.InvalidToken

        if self.repository.find_user_by_username(request.username):
            raise HTTPException(status_code=400, detail="이미 존재하는 사용자 이름입니다.")

        is_superuser = True
        if request.password1 is None:
            request.password1 = "0000"
            request.password2 = request.password1
            is_superuser = False

        if request.password1 != request.password2:
            raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")

        user = self.repository.create_user(username=request.username,
                                           hashed_password=hash_password(request.password1),
                                           name=request.name,
                                           is_superuser=is_superuser)
        return user

    def exists_user(self):
        return self.repository.exists_user()

    def change_password(self, user, request):
        user_entity = UserEntity(pk=user.pk, user_hash=user.hash_id, hashed_password=user.hashed_password)
        if not user_entity.check_password(request.current_password):
            raise self.NotFoundUser

        new_password1 = request.new_password1
        new_password2 = request.new_password2
        if new_password1 != new_password2:
            raise HTTPException(status_code=400, detail="새 비밀번호가 일치하지 않습니다.")

        hashed_password = hash_password(new_password1)
        self.repository.update_password(user=user, hashed_password=hashed_password)

    def get_user_info(self, user_hash: str):
        user = self.repository.get_user_by_user_hash(user_hash)
        if not user:
            raise self.NotFoundUser
        return user

    def get_workspaces_for_user(self, user_hash: str):
        user = self.repository.get_user_by_user_hash(user_hash)
        if not user:
            raise self.NotFoundUser

        if user.is_superuser:
            workspaces = WorkspaceRepository(self.repository.db).find_workspace_by_user_hash(user_hash)
            return [WorkspaceEntity.from_orm(x) for x in workspaces]

        return [WorkspaceEntity.from_orm(x) for x in user.workspaces]

    def delete_user(self, user_hash: str):
        user = self.repository.get_user_by_user_hash(user_hash)
        if not user:
            raise self.NotFoundUser
        self.repository.delete_user(user)
