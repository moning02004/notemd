import hashlib
import re
import secrets
from types import SimpleNamespace

from fastapi import HTTPException
from fastapi_clean_archi.core.commons.service import Service

from app.core.config import settings
from app.core.markdown_renderer import html_to_markdown, markdown_to_html
from app.modules.collab.application import client as collab_client
from app.modules.collab.application.client import CollabUnavailable
from app.modules.folder.application.service import FolderService
from app.modules.folder.infrastructure.repository import FolderRepository
from app.modules.note.application.service import NoteService, _absolute_note_links
from app.modules.note.interfaces.schemas import NoteUpdateRequest

TOKEN_PREFIX = "mdn_"
SCOPES = ("write", "read_write")
TAG_PATTERN = re.compile(r"<[^>]+>")


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


class ApiTokenService(Service):
    """설정 화면에서 쓰는 토큰 관리. 로그인한 사람 자신의 토큰만 다룬다."""

    NotFoundToken = HTTPException(status_code=404, detail="토큰을 찾을 수 없습니다.")

    def list_tokens(self, user_id: int):
        return self.repository.list_by_user_id(user_id)

    def issue_token(self, user_id: int, name: str, scope: str):
        """토큰을 만들어 (토큰, 원문) 으로 돌려준다. 원문은 이때 한 번만 알 수 있다."""
        name = (name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="토큰 이름을 입력해주세요.")
        if scope not in SCOPES:
            raise HTTPException(status_code=400, detail="권한은 write 또는 read_write 입니다.")

        raw = TOKEN_PREFIX + secrets.token_urlsafe(32)
        token = self.repository.create_token(user_id=user_id, name=name, prefix=raw[:len(TOKEN_PREFIX) + 6],
                                             token_hash=hash_token(raw), scope=scope)
        return token, raw

    def revoke_token(self, user_id: int, token_hash_id: str) -> None:
        token = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=token_hash_id)
        if token is None:
            raise self.NotFoundToken
        self.repository.delete_token(token)


class AgentNoteService:
    """API 토큰으로 들어온 프로그램(AI 에이전트 등)이 노트를 쓰고 읽는 일.

    본문은 마크다운으로 주고받는다. 저장은 앱의 노트 저장 경로(NoteService.update_note)를 그대로 거쳐
    암호화·노트 링크·백링크 표·검색 색인·스냅샷 정책이 앱에서 쓴 것과 똑같이 적용된다.
    에이전트가 쓴 것은 스냅샷 설명에 토큰 이름을 남겨 나중에 가려내거나 되돌릴 수 있게 한다.
    """

    NotFoundNote = HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    def __init__(self, note_service: NoteService):
        self.notes = note_service
        self.db = note_service.repository.db

    # ---------------------------------------------------------------- 쓰기

    def create_note(self, user, token, title: str, markdown: str, folder_path: str | None):
        folder_hash = self._ensure_folder(user, folder_path)
        note = self.notes.create_default_note(user.pk, folder_hash)
        html = markdown_to_html(markdown or "")
        self.notes.update_note(user, note.hash_id, NoteUpdateRequest(title=(title or "").strip(), content=html or None))
        note = self.notes.repository.get_by_hash_id(hash_id=note.hash_id)
        self.notes.repository.add_note_snapshot(description=f"API 토큰 '{token.name}' 로 작성", note=note)
        return note

    def append_to_note(self, user, token, note_hash: str, markdown: str):
        self._get_own_note(user, note_hash)
        if not (markdown or "").strip():
            raise HTTPException(status_code=400, detail="덧붙일 내용을 입력해주세요.")
        addition = markdown_to_html(markdown)

        # 공동 편집(4.0): 누가 노트를 열어 두고 있어도 덮이지 않게 collab 에 맡긴다. 열린 문서의 저장은 몇 초씩
        # 늦으므로, 스냅샷에 지금 모습이 담기도록 먼저 저장하게 한다. collab 을 안 쓰면 예전처럼 DB 에 쓴다.
        try:
            collab_client.flush(note_hash)
            use_collab = True
        except CollabUnavailable:
            use_collab = False
        # collab 은 다른 세션(내부 API)으로 저장했다. 이 세션이 들고 있는 노트는 낡았다.
        self.db.expire_all()
        note = self._get_own_note(user, note_hash)

        # 덧붙이기 전 모습을 남겨 둔다. 에이전트가 잘못 쓴 것을 스냅샷에서 되돌릴 수 있다.
        self.notes.repository.add_note_snapshot(description=f"API 토큰 '{token.name}' 덧붙이기 전", note=note)

        if use_collab:
            try:
                collab_client.append(note_hash, addition)
                self.db.expire_all()
                return self.notes.repository.get_by_hash_id(hash_id=note_hash)
            except CollabUnavailable:
                pass

        current = self._plain_content(note)
        content = addition if current.strip() in ("", "<p></p>") else current + addition
        self.notes.update_note(user, note_hash, NoteUpdateRequest(content=content))
        return self.notes.repository.get_by_hash_id(hash_id=note_hash)

    # ---------------------------------------------------------------- 읽기

    def get_note_markdown(self, user, note_hash: str) -> tuple:
        note = self._get_own_note(user, note_hash)
        content = self.notes._resolve_note_links(self._plain_content(note), user)
        return note, html_to_markdown(_absolute_note_links(content or ""))

    def list_notes(self, user, keyword: str | None, page: int):
        return self.notes.list_notes(user_hash=user.hash_id, keyword=(keyword or "").strip() or None,
                                     is_deleted=False, page=page, sort="-updated_at")

    def folder_paths(self, user) -> list[str]:
        folders = FolderRepository(self.db).list_by_user_id(user.pk)
        return sorted(self.folder_path_of(folder) for folder in folders)

    # ---------------------------------------------------------------- 도움

    @staticmethod
    def folder_path_of(folder) -> str | None:
        if folder is None:
            return None
        names = []
        while folder is not None:
            names.append(folder.name)
            folder = folder.parent
        return "/".join(reversed(names))

    @staticmethod
    def note_url(note_hash: str) -> str:
        return f"{settings.FRONTEND_URL}/s/{note_hash}"

    @staticmethod
    def snippet(html: str | None, length: int = 160) -> str:
        text = " ".join(TAG_PATTERN.sub(" ", html or "").split())
        return text if len(text) <= length else text[:length].rstrip() + "…"

    def _get_own_note(self, user, note_hash: str):
        """API 는 토큰 주인의 노트만 다룬다(공유 노트·휴지통 노트는 앱에서)."""
        note = self.notes.repository.get_by_hash_id(hash_id=note_hash)
        if note is None or note.user_id != user.pk or note.deleted_at is not None:
            raise self.NotFoundNote
        return note

    def _plain_content(self, note) -> str:
        content = note.content or ""
        return self.notes._decrypt_content(note.user, content) if note.is_encrypted else content

    def _ensure_folder(self, user, folder_path: str | None) -> str | None:
        """'업무/회의' 같은 경로를 따라 폴더를 찾고, 없는 폴더는 만든다. 폴더 깊이 제한 등은 폴더 API 와 같다."""
        names = [name.strip() for name in (folder_path or "").split("/") if name.strip()]
        if not names:
            return None

        repository = FolderRepository(self.db)
        folder_service = FolderService(repository)
        folders = repository.list_by_user_id(user.pk)
        parent = None
        for name in names:
            parent_id = parent.pk if parent else None
            found = next((f for f in folders if f.parent_id == parent_id and f.name == name), None)
            if found is None:
                found = folder_service.create_folder(
                    user.pk, SimpleNamespace(name=name, parent=parent.hash_id if parent else None))
                folders.append(found)
            parent = found
        return parent.hash_id
