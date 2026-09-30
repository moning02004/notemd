import hmac
import secrets

from fastapi import HTTPException
from fastapi_clean_archi.core.auth import hash_password
from fastapi_clean_archi.core.commons.service import Service

from app.core.config import settings
from app.core.jwt_util import jwt_manager, verify_refresh_token
from app.modules.user.domain.entity import UserEntity
from app.modules.workspace.domain.entity import WorkspaceEntity
from app.modules.workspace.infrastructure.repository import WorkspaceRepository


# 헷갈리기 쉬운 글자(0/o, 1/l/i)를 뺀 소문자·숫자. 불러 주거나 옮겨 적기 쉽게 네 글자씩 끊는다.
TEMPORARY_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def _temporary_password() -> str:
    """관리자가 일반 사용자를 추가할 때 주는 임시 비밀번호. 예: k7mq-3xpd-9wha (약 59비트)."""
    return "-".join("".join(secrets.choice(TEMPORARY_PASSWORD_ALPHABET) for _ in range(4)) for _ in range(3))


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
        return tokens, user_entity.user_hash, bool(user.must_change_password)

    def refresh_token(self, token):
        if not verify_refresh_token(token):
            raise self.InvalidToken

        payload = jwt_manager.decode_payload(token)
        user = self.repository.get_user_by_user_hash(payload["user_hash"])
        if not user:
            raise self.NotFoundUser

        new_tokens = jwt_manager.create({"user_hash": user.hash_id})
        return new_tokens, user.hash_id, bool(user.must_change_password)

    def list_members(self):
        return self.repository.find_members()

    def create_user(self, user, request):
        """계정을 만든다. 두 갈래뿐이다.

        - 관리자 가입: 비밀번호를 정해 가입한다. 서버의 ADMIN_KEY 를 아는 사람만 된다.
        - 일반 사용자 추가: 관리자가 로그인한 채 비밀번호 없이 만든다. 무작위 임시 비밀번호를 만들어
          (계정, 임시 비밀번호) 로 돌려준다. 처음 로그인하면 새 비밀번호로 바꿔야 한다(예전에는 모두 0000).
        관리자 가입은 (계정, None) 을 돌려준다.
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

        temporary_password = None
        if not is_superuser:
            temporary_password = _temporary_password()
            request.password1 = request.password2 = temporary_password

        if request.password1 != request.password2:
            raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")

        user = self.repository.create_user(username=request.username,
                                           hashed_password=hash_password(request.password1),
                                           name=request.name,
                                           is_superuser=is_superuser,
                                           must_change_password=temporary_password is not None)
        return user, temporary_password

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

    def _get_visible_user(self, viewer, user_hash: str):
        """본인이나 관리자만 계정 정보를 볼 수 있다. 예전에는 로그인하지 않아도 hash 만 알면 아이디·이름·
        참여 워크스페이스가 보였다. 남의 계정은 있는지조차 알리지 않도록 없는 계정과 같이 404 로 답한다."""
        if viewer.hash_id != user_hash and not viewer.is_superuser:
            raise self.NotFoundUser
        user = self.repository.get_user_by_user_hash(user_hash)
        if not user:
            raise self.NotFoundUser
        return user

    def get_user_info(self, viewer, user_hash: str):
        return self._get_visible_user(viewer, user_hash)

    def get_workspaces_for_user(self, viewer, user_hash: str):
        user = self._get_visible_user(viewer, user_hash)

        if user.is_superuser:
            workspaces = WorkspaceRepository(self.repository.db).find_workspace_by_user_hash(user_hash)
            return [WorkspaceEntity.from_orm(x) for x in workspaces]

        return [WorkspaceEntity.from_orm(x) for x in user.workspaces]

    def delete_user(self, user_hash: str):
        user = self.repository.get_user_by_user_hash(user_hash)
        if not user:
            raise self.NotFoundUser
        self.repository.delete_user(user)
