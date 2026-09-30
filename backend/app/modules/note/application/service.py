import base64
import html as html_lib
import io
import json
import os
import posixpath
import re
import zipfile
from dataclasses import asdict
from datetime import datetime, timezone
from typing import List
from urllib.parse import quote
from zoneinfo import ZoneInfo

import fitz
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException
from fastapi_clean_archi.core.commons.service import Service
from markdown import markdown

from app.core.config import settings
from app.core.markdown_renderer import html_to_markdown, markdown_to_html
from app.core.pdf_renderer import render_note_pdf, upload_name
from app.modules.note.application.note_links import (NOTE_LINK_PATTERN, NoteLinkState, note_link_hashes,
                                                     rewrite_note_links)
from app.modules.note.domain.entity import NoteEntity, DownloadResult, build_note_document
from app.modules.folder.infrastructure.repository import FolderRepository
from app.modules.template.infrastructure.repository import TemplateRepository
from app.modules.note.infrastructure.models import Note, NoteSnapshot
from app.modules.user.infrastructure.models import User
from app.modules.user.infrastructure.repository import UserRepository


def _same_moment(a: datetime, b: datetime) -> bool:
    """두 시각이 같은 순간인지. SQLite 는 시간대 없이(UTC) 돌려주므로 시간대를 맞춰 비교한다."""
    def utc(value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    return utc(a) == utc(b)


KST = ZoneInfo("Asia/Seoul")

# 파일·폴더 이름에 쓸 수 없는 글자는 지우지 않고 비슷하게 생긴 전각 글자로 바꾼다.
# 지우면 '9/25 회의' 가 '925 회의' 가 되어 뜻이 바뀐다.
FILENAME_SAFE = str.maketrans('/\\:*?"<>|', "／＼：＊？＂＜＞｜")


def _safe_name(name: str) -> str:
    return (name or "").translate(FILENAME_SAFE).strip()


def _zip_datetime(value: datetime | None) -> datetime:
    """서비스 기준 시간(KST)의 시각. SQLite 는 시간대 없이(UTC) 돌려준다."""
    if value is None:
        return datetime.now(KST)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(KST)


def _zip_time(value: datetime | None) -> tuple:
    """zip 안 파일의 수정 시각. zip 은 시간대 없이 적으므로 서비스 기준 시간(KST)으로 적는다."""
    return _zip_datetime(value).timetuple()[:6]


# 데이터 내보내기 zip 의 맨 위 구조. 이미지는 노트·스냅샷·템플릿이 함께 쓴다.
EXPORT_NOTES_DIR = "노트"
EXPORT_SNAPSHOTS_DIR = "스냅샷"
EXPORT_TEMPLATES_DIR = "템플릿"
EXPORT_IMAGE_DIR = "images"
IMG_SRC_PATTERN = re.compile(r'(<img\b[^>]*\bsrc=")([^"]*)(")')
HREF_PATTERN = re.compile(r'\shref="[^"]*"')


def _note_url(note_hash: str) -> str:
    """노트 화면의 전체 주소. 내보낸 파일은 앱 밖에서 열리므로 /s/... 만으로는 갈 곳이 없다."""
    return f"{settings.FRONTEND_URL}/s/{note_hash}"


def _absolute_note_links(content: str) -> str:
    """본문의 노트 링크(href="/s/...")를 scheme 과 host 까지 붙인 전체 주소로 바꾼다."""
    if not settings.FRONTEND_URL:
        return content
    return NOTE_LINK_PATTERN.sub(
        lambda m: f'<a{HREF_PATTERN.sub("", m.group("attrs"))} href="{_note_url(m.group("hash"))}">{m.group("text")}</a>',
        content)


def _relative_link(from_dir: str, target: str) -> str:
    """zip 안 from_dir 폴더에 있는 파일에서 target 으로 가는 상대 경로. 마크다운 링크에 넣도록 퍼센트 인코딩한다."""
    return quote(posixpath.relpath(target, from_dir or "."))


def _front_matter(fields: dict[str, str]) -> str:
    """파일 맨 위의 정보(YAML front matter). Obsidian 등이 읽는다. 값은 JSON 문자열로 적어 따옴표·콜론이 섞여도 된다."""
    lines = [f"{key}: {json.dumps(value, ensure_ascii=False)}" for key, value in fields.items() if value]
    return "---\n" + "\n".join(lines) + "\n---\n\n"


def _snapshot_label(description: str | None) -> tuple[str, str]:
    """스냅샷 설명 → (파일 이름에 붙일 말, front matter 에 적을 설명).

    자동 스냅샷은 'auto_<시각>' 이나 'auto_<시각>_by_<이름>' 으로 저장된다. 파일 이름에는 시각만으로 충분하다.
    """
    description = (description or "").strip()
    if not description.startswith("auto_"):
        return description, description
    editor = description.split("_by_", 1)[1] if "_by_" in description else ""
    return "", f"자동 저장 ({editor})" if editor else "자동 저장"


def _folder_dirs(folders) -> dict[int, str]:
    """폴더 pk → 노트 폴더 안의 경로("상위/하위"). 같은 부모 아래 이름이 겹치면 뒤에 (2), (3) 을 붙인다."""
    by_parent: dict[int | None, list] = {}
    for folder in folders:
        by_parent.setdefault(folder.parent_id, []).append(folder)

    paths: dict[int, str] = {}

    def walk(parent_id: int | None, prefix: str):
        used: set[str] = set()
        for folder in sorted(by_parent.get(parent_id, []), key=lambda f: (f.name, f.pk)):
            base = _safe_name(folder.name).strip(".") or "이름 없는 폴더"
            name, n = base, 2
            while name in used:
                name, n = f"{base} ({n})", n + 1
            used.add(name)
            paths[folder.pk] = f"{prefix}{name}"
            walk(folder.pk, f"{prefix}{name}/")

    walk(None, "")
    return paths


class NoteService(Service):
    NotFoundNote = HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    # 410 은 브라우저가 따로 말하지 않아도 캐시해 두는 응답이다. 그러면 로그인한 뒤에도,
    # 복원한 뒤에도 서버에 묻지 않고 '삭제된 노트' 를 계속 보여준다.
    DeletedNote = HTTPException(status_code=410, detail="삭제된 노트입니다.",
                                headers={"Cache-Control": "no-store"})

    def __init__(self, repository, search_service=None, storage=None):
        super().__init__(repository)
        self.storage = storage
        self.search_service = search_service

    def indexing_note(self, note):
        self.search_service.add_to_index(asdict(build_note_document(note)))

    def _get_owned_note(self, user_id, note_hash: str) -> Note:
        note = self.repository.get_by_hash_id(hash_id=note_hash)
        if note is None or note.user_id != user_id:
            raise self.NotFoundNote
        return note

    @classmethod
    def _load_user_dek(cls, user):
        blob = user.key.key_blob
        kek = base64.b64decode(settings.KEK)
        return AESGCM(kek).decrypt(
            blob[:12], blob[12:], f"user:{user.pk}".encode()
        )

    @classmethod
    def _encrypt_content(cls, user, content):
        dek = cls._load_user_dek(user)
        nonce = os.urandom(12)
        encrypted_content = AESGCM(dek).encrypt(
            nonce, content.encode(), f"user:{user.pk}".encode()
        )
        return base64.b64encode(nonce + encrypted_content).decode("ascii")

    @classmethod
    def _decrypt_content(cls, user, content):
        try:
            dek = cls._load_user_dek(user)
            blob = base64.b64decode(content)
            return AESGCM(dek).decrypt(
                blob[:12], blob[12:], f"user:{user.pk}".encode()
            ).decode()
        except ValueError:
            return content

    def _get_owned_snapshot(self, user_id, note_snapshot_hash: str) -> Note:
        note_snapshot = self.repository.get_note_snapshot_by_hash_id(user_id=user_id, hash_id=note_snapshot_hash)
        if note_snapshot is None:
            raise self.NotFoundNote
        return note_snapshot

    def list_notes(self, user_hash: str, keyword: str | None, is_deleted: bool, page: int, tag: str | None = None,
                   sort: str | None = None, folder: str | None = None, include_sub: bool = False,
                   unfiled: bool = False) -> \
            List[NoteEntity]:
        if keyword is None:
            notes = self.repository.list_note_by_user_hash(user_hash, is_deleted, tag, sort, page,
                                                           folder_hash=folder,
                                                           include_sub=include_sub,
                                                           unfiled=unfiled)
        else:
            note_hashes = self.search_service.find_documents(keyword, user_hash, sort, page)
            # 색인은 휴지통 여부를 걸러주지 않으므로 조회 단계에서 목록과 같은 조건으로 맞춘다.
            notes = self.repository.get_by_hash_ids_and_user_id(note_hashes=note_hashes,
                                                                user_hash=user_hash,
                                                                is_deleted=is_deleted)

        for note in notes:
            if note.is_encrypted:
                note.content = self._decrypt_content(note.user, note.content)
        return notes

    def create_default_note(self, user_id: int, folder_hash: str | None = None):
        default_note = NoteEntity(
            user_id=user_id,
            title="",
            content="<p></p>",
            folder_id=self._folder_pk(user_id, folder_hash),
        )
        note = self.repository.create_note(default_note)
        self.indexing_note(note)
        return note

    def get_note_by_hash_id(self, user_id: int | None, note_hash: str, password: str | None = None):
        note = self.repository.get_by_hash_id(hash_id=note_hash)
        if note is None or (not note.is_public and user_id is None):
            raise self.NotFoundNote

        note_password = self._decrypt_content(note.user, note.password) if note.password else None
        if note.user_id != user_id and note.password:
            if note_password != password:
                raise HTTPException(status_code=403, detail={
                    "message": "비밀번호가 일치하지 않습니다.",
                    "is_password": True
                })

        note.is_editable = False
        user = None
        if user_id:
            user = UserRepository(self.repository.db).get_by_pk(user_id)
            workspaces = self.repository.get_shared_workspace(
                workspace_hashes=[x.hash_id for x in note.workspaces],
                user_id=user.pk)

            # 공개 노트는 로그인 여부와 무관하게 열람할 수 있어야 한다.
            if not note.is_public and not user.is_superuser and not workspaces and note.user_id != user.pk:
                raise self.NotFoundNote

            if note.password:
                note.password = note_password
            note.is_editable = note.user_id == user.pk or user.is_superuser or bool(workspaces)

        # 휴지통에 있는 노트는 주인에게만 '휴지통에 있다' 는 표시와 함께 읽기 전용으로 보여준다.
        # 볼 권한이 있던 다른 사람에게는 본문 없이 삭제되었다는 것만 알린다.
        note.is_deleted = note.deleted_at is not None
        if note.is_deleted:
            if note.user_id != user_id:
                raise self.DeletedNote
            note.is_editable = False

        if note.is_encrypted:
            note.content = self._decrypt_content(note.user, note.content)
        # 조회 경로는 커밋하지 않으므로, 보는 사람에 맞춰 바꾼 본문이 DB 에 남지 않는다.
        note.content = self._resolve_note_links(note.content, user)
        return note

    def _resolve_note_links(self, content: str | None, viewer: User | None) -> str | None:
        """본문의 노트 링크를 지금 대상 노트의 제목과, 보는 사람이 볼 수 있는지에 맞춰 다시 쓴다.

        권한 판단은 get_note_by_hash_id 와 같다. 링크 글자만 보고도 그 노트를 열 수 있는지
        알 수 있어야 하고, 열 수 없는 노트의 제목은 새면 안 된다.
        """
        hashes = note_link_hashes(content)
        if not hashes:
            return content

        targets, member_workspace_ids = self.repository.get_link_targets(hashes, viewer.pk if viewer else None)
        resolved = {target.hash_id: (self._link_state(target, viewer, member_workspace_ids), target.title or "")
                    for target in targets}
        return rewrite_note_links(content, resolved)

    @staticmethod
    def _link_state(note: Note, viewer: User | None, member_workspace_ids: set[int]) -> NoteLinkState:
        """보는 사람이 링크 너머의 노트를 열 수 있는지. 권한 판단은 get_note_by_hash_id 와 같다."""
        is_owner = viewer is not None and note.user_id == viewer.pk
        can_read = (is_owner or note.is_public
                    or bool(viewer and viewer.is_superuser)
                    or any(workspace.pk in member_workspace_ids for workspace in note.workspaces))

        if not can_read:
            return NoteLinkState.UNAVAILABLE
        if note.password and not is_owner:
            return NoteLinkState.LOCKED
        if note.deleted_at:
            return NoteLinkState.DELETED
        return NoteLinkState.OK

    def get_backlinks(self, viewer: User, note_hash: str) -> list[dict]:
        """이 노트를 가리키는 노트 중 보는 사람이 열 수 있는 것.

        대상 노트의 비밀번호는 묻지 않는다. 돌려주는 것은 보는 사람이 원래 열 수 있는 노트뿐이고,
        그 노트들의 본문에는 이미 이 링크가 보이기 때문이다. 대신 대상 노트를 볼 수 없는 사람에게는
        노트가 있는지조차 알리지 않는다.
        """
        target = self.repository.get_by_hash_id(hash_id=note_hash)
        if target is None:
            raise self.NotFoundNote
        target_workspaces = self.repository.member_workspace_ids({w.pk for w in target.workspaces}, viewer.pk)
        target_state = self._link_state(target, viewer, target_workspaces)
        if target_state == NoteLinkState.UNAVAILABLE:
            raise self.NotFoundNote
        if target_state == NoteLinkState.DELETED and target.user_id != viewer.pk:
            raise self.DeletedNote

        sources = self.repository.get_backlink_sources(target)
        member_workspace_ids = self.repository.member_workspace_ids(
            {workspace.pk for source in sources for workspace in source.workspaces}, viewer.pk)

        backlinks = []
        for source in sources:
            state = self._link_state(source, viewer, member_workspace_ids)
            if state == NoteLinkState.UNAVAILABLE:
                continue
            locked = state == NoteLinkState.LOCKED
            backlinks.append({
                "hash_id": source.hash_id,
                # 잠긴 노트는 제목도 비밀번호 뒤에 있다(본문 링크와 같은 규칙).
                "title": "" if locked else (source.title or ""),
                "is_locked": locked,
                "updated_at": source.updated_at,
            })
        return backlinks

    def _store_note_links(self, content: str) -> str:
        """저장할 본문의 노트 링크를 실제 제목으로 채우고, 보는 사람에 따라 붙었던 상태는 뗀다.

        편집하는 사람이 볼 수 없는 노트는 에디터에 '볼 수 없는 노트' 로 내려가 있다. 그대로 저장하면
        주인의 미리보기와 검색에 그 글자가 남는다. 저장본은 보여주기 전에 늘 다시 쓰이므로 새지 않는다.
        """
        hashes = note_link_hashes(content)
        if not hashes:
            return content

        targets, _ = self.repository.get_link_targets(hashes, None)
        resolved = {target.hash_id: (NoteLinkState.OK, target.title or "") for target in targets}
        return rewrite_note_links(content, resolved, keep_unresolved=True)

    def _folder_pk(self, user_id: int, folder_hash: str | None) -> int | None:
        """폴더 hash 를 pk 로 바꾼다. 남의 폴더를 가리키면 폴더 없이 만든다."""
        if not folder_hash:
            return None
        folder = FolderRepository(self.repository.db).get_by_hash_id_and_user_id(
            user_id=user_id, hash_id=folder_hash)
        return folder.pk if folder else None

    def update_note(self, user: User, note_hash: str, request):
        note = self.repository.get_by_hash_id(hash_id=note_hash)

        # 본문 키는 언제나 노트 소유자의 것이다. 공유 멤버가 편집해도 소유자가 읽을 수 있어야 한다.
        owner = note.user
        content = request.content or (
            self._decrypt_content(owner, note.content) if note.is_encrypted else note.content)
        if request.content:
            content = self._store_note_links(content)
        # 암호화하기 전의 평문에서 링크를 뽑아 둔다. 표에 적는 건 권한을 확인한 뒤다.
        linked_hashes = note_link_hashes(content) if request.content else None

        is_encrypted = request.is_encrypted if request.is_encrypted is not None else note.is_encrypted
        if is_encrypted:
            content = self._encrypt_content(owner, content)

        workspaces = self.repository.get_shared_workspace(
            workspace_hashes=[x.hash_id for x in note.workspaces],
            user_id=user.pk)

        if not user.is_superuser and not workspaces and note.user_id != user.pk:
            raise self.NotFoundNote

        is_editable = note.user_id == user.pk or user.is_superuser or bool(workspaces)
        if not is_editable:
            raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")
        # 휴지통에서 고치면 복원했을 때 무엇이 바뀌었는지 아무도 모른다. 먼저 복원해야 한다.
        if note.deleted_at is not None:
            raise HTTPException(status_code=409, detail="휴지통에 있는 노트는 복원한 뒤에 고칠 수 있습니다.")
        # 편집 화면이 받은 뒤로 다른 곳(다른 탭·기기·공유 멤버)에서 저장했다. 그대로 쓰면 그 내용이 사라진다.
        if request.base_updated_at is not None and not _same_moment(request.base_updated_at, note.updated_at):
            raise HTTPException(status_code=409, detail={
                "message": "다른 곳에서 먼저 저장된 내용이 있습니다.",
                "is_conflict": True,
                "updated_at": note.updated_at.isoformat(),
            })

        note.is_editable = is_editable

        password = None
        if request.password is not None:
            # 빈 문자열은 '잠금 해제' 다. 여기서 None 으로 뭉개면 비밀번호를 영영 못 지운다.
            password = self._encrypt_content(owner, request.password) if request.password else ""

        # -1 은 '요청에 folder 키가 없었다'. None 이면 미분류로 옮긴다.
        folder_id = -1
        if "folder" in request.model_fields_set:
            folder_id = self._folder_pk(note.user_id, request.folder)

        if linked_hashes is not None:
            # repository.update_note 가 함께 커밋한다.
            self.repository.replace_note_links(note, linked_hashes)

        note = self.repository.update_note(user_id=user.pk,
                                           note=note,
                                           title=request.title,
                                           content=content,
                                           is_public=request.is_public,
                                           is_protected=request.is_protected,
                                           is_encrypted=request.is_encrypted,
                                           password=password,
                                           tags=request.tags,
                                           workspaces=request.workspaces,
                                           folder_id=folder_id)
        preference = owner.preference
        snapshot_policy = preference.snapshot_policy if preference else "MANUAL"
        # 공유 중인 노트는 정책과 무관하게 매 편집을 남긴다. 편집자가 멤버인지가 아니라
        # 노트가 공유 중인지가 기준이어야 소유자의 편집도 이력에 남는다.
        if ((snapshot_policy == "ON_FIRST_EDIT" and request.is_first_edit)
                or snapshot_policy == "ON_EVERY_EDIT"
                or bool(note.workspaces)):
            self.repository.add_note_snapshot(description=f"auto_{int(note.updated_at.timestamp())}_by_{user.name}",
                                              note=note)
        if request.is_encrypted:
            note.content = self._decrypt_content(owner, content)
        if password:
            note.password = self._decrypt_content(owner, password)

        self.indexing_note(note)
        # 저장본에는 실제 제목이 들어가므로, 돌려주는 본문은 조회와 같이 보는 사람 기준으로 다시 쓴다.
        # 이미 커밋했고 이 뒤로는 커밋하지 않으므로 DB 에는 남지 않는다.
        note.content = self._resolve_note_links(note.content, user)
        return note

    def soft_delete_note(self, user_id: int, note_hashes: list):
        notes = self.repository.soft_delete_note(user_id=user_id, note_hashes=note_hashes)
        self._update_index_after(notes)
        return [x.hash_id for x in notes]

    def hard_delete_note(self, user_id: int, note_hashes: List):
        self.repository.hard_delete_note(user_id=user_id, note_hashes=note_hashes)
        self.search_service.delete_from_index(doc_ids=note_hashes)

    def restore_note(self, user_id: int, note_hashes: List[str]):
        notes = self.repository.restore_note(user_id=user_id, note_hashes=note_hashes)
        self._update_index_after(notes)
        return [x.hash_id for x in notes]

    async def create_note_image(self, user_id, note_hash: str, file):
        note = self._get_owned_note(user_id, note_hash)

        filepath = await self.storage.save(file, note_hash=note_hash)
        return {
            "url": filepath
        }

    async def create_note_from_files(self, user_id, files):
        current_date = datetime.now().strftime("%Y-%m-%d")
        for file in files:
            title = f"[{current_date}_업로드] {file.filename}"
            content = await file.read()
            filetype = file.headers["content-type"].split("/")[-1]

            if filetype == "pdf":
                doc = fitz.open(stream=content, filetype="pdf")
                texts = [page.get_text() for page in doc]
                content = "\n\n---\n\n".join(texts)
                content = re.sub(r"\n", "\n\n", content)
            else:
                content = content.decode("utf-8")
                file_format = file.filename.split(".")[-1]
                if file_format in ["sh", "py", "js", "java", "c", "cpp", "go", "rb",
                                   "html", "css", "json", "xml", "yaml", "yml",
                                   "ini", "conf", "cfg", "toml"]:
                    content = f"```{file_format}\n{content}\n```"

            note_entity = NoteEntity(
                user_id=user_id,
                title=title,
                content=markdown(content, extensions=['fenced_code']) if filetype == "pdf"
                else markdown_to_html(content),
            )
            note = self.repository.create_note(note_entity)
            self.indexing_note(note)

        return ["filepath"]

    async def download_note(self, user_hash: str, note_hashes: list, file_format: str = "md"):
        notes = self.repository.get_by_hash_ids_and_user_id(note_hashes=note_hashes, user_hash=user_hash)

        if not notes:
            raise self.NotFoundNote

        if len(notes) == 1:
            note = notes[0]
            return DownloadResult(
                content=self._render_note(note, file_format),
                media_type=self.MEDIA_TYPES[file_format],
                filename=self._safe_filename(note.title, file_format),
            )

        # 둘 이상 -> zip
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            used_names = set()
            for note in notes:
                filename = self._unique_filename(note.title, file_format, used_names)
                zf.writestr(filename, self._render_note(note, file_format))

        buffer.seek(0)
        return DownloadResult(
            content=buffer.getvalue(),
            media_type="application/zip",
            filename="notes.zip",
        )

    def export_notes(self, user: User) -> DownloadResult:
        """노트·스냅샷·템플릿을 마크다운 zip 으로 내보낸다.

            노트/    폴더 구조 그대로. 미분류 노트는 노트/ 바로 아래('미분류' 폴더는 만들지 않는다). 빈 폴더도 남긴다.
            스냅샷/  노트 자리를 따라간 폴더(노트/업무/회의.md → 스냅샷/업무/회의/) 안에 '만든 시각 설명.md'.
            템플릿/  템플릿마다 '이름.md'.
            images/  업로드한 이미지. 셋이 함께 쓴다.

        휴지통 노트와 그 스냅샷은 넣지 않는다. 암호화된 것은 풀어서 넣는다.
        본문의 노트 링크는 zip 안의 그 노트 파일을 가리키는 상대 경로로 바꾸고(Obsidian 등에서 그대로 열린다),
        zip 에 없는 노트(휴지통·남의 노트)는 앱의 노트 화면 전체 주소(scheme://host/s/...)로 적는다.
        업로드한 이미지는 저장소에서 받아 images/ 에 담고 본문이 그 파일을 가리키게 한다. 바깥 주소 이미지는 그대로 둔다.
        """
        db = self.repository.db
        folders = FolderRepository(db).list_by_user_id(user.pk)
        dirs = {pk: f"{EXPORT_NOTES_DIR}/{path}" for pk, path in _folder_dirs(folders).items()}
        notes = self.repository.list_for_export(user.pk)
        snapshots = self.repository.list_snapshots_for_export([note.pk for note in notes])
        templates = TemplateRepository(db).list_by_user_id(user.pk)

        # 링크를 상대 경로로 바꾸려면 모든 노트의 자리를 먼저 정해 둬야 한다.
        paths: dict[str, str] = {}
        used_names: dict[str, set] = {}
        for note in notes:
            directory = dirs.get(note.folder_id, EXPORT_NOTES_DIR)
            filename = self._unique_filename(note.title or "", "md", used_names.setdefault(directory, set()))
            paths[note.hash_id] = f"{directory}/{filename}"

        buffer = io.BytesIO()
        images: dict[str, str | None] = {}  # 업로드 이름 → zip 안 경로(못 받은 것은 None)

        def write(path: str, when: datetime | None, text: str):
            info = zipfile.ZipInfo(path, date_time=_zip_time(when))
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, text.encode("utf-8"))

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            now = datetime.now(timezone.utc)
            for top in (EXPORT_NOTES_DIR, EXPORT_SNAPSHOTS_DIR, EXPORT_TEMPLATES_DIR):
                zf.writestr(zipfile.ZipInfo(f"{top}/", date_time=_zip_time(now)), "")
            for folder in folders:
                zf.writestr(zipfile.ZipInfo(f"{dirs[folder.pk]}/", date_time=_zip_time(folder.updated_at)), "")

            for note in notes:
                path = paths[note.hash_id]
                content = self._decrypt_content(user, note.content) if note.is_encrypted else note.content
                write(path, note.updated_at, self._export_markdown(content, user, posixpath.dirname(path),
                                                                   paths, images, zf))

            notes_by_pk = {note.pk: note for note in notes}
            used_snapshot_names: dict[str, set] = {}
            for snapshot in snapshots:
                note_path = paths[notes_by_pk[snapshot.note_id].hash_id]
                directory = f"{EXPORT_SNAPSHOTS_DIR}/{note_path[len(EXPORT_NOTES_DIR) + 1:-len('.md')]}"
                label, description = _snapshot_label(snapshot.description)
                name = f"{_zip_datetime(snapshot.created_at):%Y-%m-%d %H.%M.%S}"
                name = f"{name} {label}" if label else name
                filename = self._unique_filename(name, "md", used_snapshot_names.setdefault(directory, set()))
                header = _front_matter({
                    "title": snapshot.title or "",
                    "note": note_path,
                    "created": f"{_zip_datetime(snapshot.created_at):%Y-%m-%d %H:%M:%S}",
                    "description": description,
                })
                body = self._export_markdown(self._snapshot_content(user, snapshot), user, directory,
                                             paths, images, zf)
                write(f"{directory}/{filename}", snapshot.created_at, header + body)

            used_template_names: set = set()
            for template in templates:
                filename = self._unique_filename(template.name or "", "md", used_template_names)
                header = _front_matter({"title": template.title or "", "description": template.description or ""})
                body = self._export_markdown(template.content or "", user, EXPORT_TEMPLATES_DIR, paths, images, zf)
                write(f"{EXPORT_TEMPLATES_DIR}/{filename}", template.updated_at, header + body)

        return DownloadResult(
            content=buffer.getvalue(),
            media_type="application/zip",
            filename=f"note.md-{datetime.now(KST):%Y%m%d}.zip",
        )

    def _snapshot_content(self, owner: User, snapshot: NoteSnapshot) -> str:
        """스냅샷은 찍을 때의 저장본을 그대로 담아 두므로 그때 노트가 암호화돼 있었으면 암호문이다."""
        try:
            return self._decrypt_content(owner, snapshot.content or "")
        except InvalidTag:
            return snapshot.content or ""

    def _export_markdown(self, content: str | None, owner: User, directory: str, paths: dict[str, str],
                         images: dict[str, str | None], zf: zipfile.ZipFile) -> str:
        content = self._resolve_note_links(content or "", owner)

        def link(match: re.Match) -> str:
            target = paths.get(match.group("hash"))
            attrs = HREF_PATTERN.sub("", match.group("attrs"))
            # zip 에 없는 노트(휴지통·남의 노트)는 앱의 그 노트 화면으로 보낸다.
            href = _relative_link(directory, target) if target else _note_url(match.group("hash"))
            return f'<a{attrs} href="{href}">{match.group("text")}</a>'

        def image(match: re.Match) -> str:
            name = upload_name(html_lib.unescape(match.group(2)))
            if not name or not self.storage:
                return match.group(0)
            if name not in images:
                data = self.storage.read(name)
                images[name] = f"{EXPORT_IMAGE_DIR}/{name}" if data is not None else None
                if data is not None:
                    zf.writestr(images[name], data)
            if images[name] is None:
                return match.group(0)
            return f"{match.group(1)}{_relative_link(directory, images[name])}{match.group(3)}"

        content = NOTE_LINK_PATTERN.sub(link, content)
        content = IMG_SRC_PATTERN.sub(image, content)
        return html_to_markdown(content)

    MEDIA_TYPES = {
        "md": "text/markdown",
        "pdf": "application/pdf",
    }

    def _render_note(self, note, file_format: str) -> bytes:
        """노트 본문을 요청한 형식의 바이트로 만든다. 암호화된 노트는 먼저 복호화한다."""
        content = self._decrypt_content(note.user, note.content) if note.is_encrypted else note.content
        content = self._resolve_note_links(content, note.user)
        # 받은 파일은 앱 밖에서 열리므로 노트 링크를 전체 주소로 적는다(PDF 의 링크도 눌러서 열리게).
        content = _absolute_note_links(content)

        if file_format == "pdf":
            # 본문 이미지는 저장소에서 받아 넣는다(로컬 디스크든 MinIO 든 저장소가 안다).
            read_image = self.storage.read if self.storage else None
            return render_note_pdf(title=note.title, content=content, read_image=read_image)
        return html_to_markdown(content).encode("utf-8")

    @staticmethod
    def _safe_filename(title: str, file_format: str = "md") -> str:
        # 파일명에 쓸 수 없는 글자는 전각 글자로 바꾼다(_safe_name).
        cleaned = _safe_name(title) or "제목없음"
        suffix = f".{file_format}"
        if cleaned.endswith(suffix):
            cleaned = cleaned[:-len(suffix)]
        return f"{cleaned}{suffix}"

    @classmethod
    def _unique_filename(cls, title: str, file_format: str, used_names: set) -> str:
        filename = cls._safe_filename(title, file_format)
        base = filename[:-len(file_format) - 1]
        i = 1
        while filename in used_names:
            filename = f"{base}_{i}.{file_format}"
            i += 1
        used_names.add(filename)
        return filename

    def get_note_snapshots(self, user_id, note_hash):
        note = self._get_owned_note(user_id, note_hash)
        snapshots = self.repository.find_note_snapshots(note_hash=note.hash_id)
        for snapshot in snapshots:
            try:
                snapshot.content = self._decrypt_content(note.user, snapshot.content)
            except InvalidTag:
                pass
        return snapshots

    def create_note_snapshot(self, user_id, note_hash, description) -> NoteSnapshot:
        note = self._get_owned_note(user_id, note_hash)
        snapshot = self.repository.add_note_snapshot(description=description, note=note)
        return snapshot

    def delete_note_snapshot(self, user_id, note_snapshot_hash):
        note_snapshot = self._get_owned_snapshot(user_id, note_snapshot_hash)
        self.repository.remove_note_snapshot(note_snapshot)

    def _update_index_after(self, notes):
        for note in notes:
            self.indexing_note(note)
