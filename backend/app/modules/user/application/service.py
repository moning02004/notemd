import hmac

from fastapi import HTTPException
from fastapi_clean_archi.core.auth import hash_password
from fastapi_clean_archi.core.commons.service import Service

from app.core.config import settings
from app.core.jwt_util import jwt_manager, verify_refresh_token
from app.modules.user.domain.entity import UserEntity
from app.modules.workspace.domain.entity import WorkspaceEntity
from app.modules.workspace.infrastructure.repository import WorkspaceRepository


class UserService(Service):
    NotFoundUser = HTTPException(status_code=404, detail="계정을 찾을 수 없습니다.")
    InvalidToken = HTTPException(status_code=403, detail="토큰이 유효하지 않습니다.")
    InvalidAdminKey = HTTPException(status_code=403, detail="관리자 키가 일치하지 않습니다.")
    LoginRequired = HTTPException(status_code=401, detail="인증이 필요합니다.")

    def obtain_token(self, request):
        user = self.repository.find_user_by_username(request.username)
        if not user:
            raise self.NotFoundUser

        if user.key is None:
            self.repository.create_user_key(user)

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
        """계정을 만든다. 두 갈래뿐이다.

        - 관리자 가입: 비밀번호를 정해 가입한다. 서버의 ADMIN_KEY 를 아는 사람만 된다.
        - 일반 사용자 추가: 관리자가 로그인한 채 비밀번호 없이 만든다. 초기 비밀번호는 0000.
        예전에는 로그인하지 않은 요청을 막지 않아, 누구나 관리자나 일반 계정을 만들 수 있었다.
        """
        is_superuser = request.password1 is not None
        if is_superuser:
            # ADMIN_KEY 가 비어 있으면 어떤 키로도 가입할 수 없다. 설정을 빠뜨린 서버가 열려 있으면 안 된다.
            if not settings.ADMIN_KEY or not hmac.compare_digest(
                    (request.admin_key or "").encode(), settings.ADMIN_KEY.encode()):
                raise self.InvalidAdminKey
        elif user is None:
            raise self.LoginRequired
        elif not user.is_superuser:
            raise self.InvalidToken

        if self.repository.find_user_by_username(request.username):
            raise HTTPException(status_code=400, detail="이미 존재하는 사용자 이름입니다.")

        if not is_superuser:
            request.password1 = "0000"
            request.password2 = request.password1

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
