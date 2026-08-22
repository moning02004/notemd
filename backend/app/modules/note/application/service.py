import base64
import io
import os
import re
import zipfile
from dataclasses import asdict
from datetime import datetime
from typing import List

import fitz
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException
from fastapi_clean_archi.core.commons.service import Service
from markdown import markdown
from markdownify import markdownify

from app.core.config import settings
from app.core.pdf_renderer import render_note_pdf
from app.modules.note.domain.entity import NoteEntity, NoteDocument, DownloadResult
from app.modules.note.infrastructure.models import Note, NoteSnapshot
from app.modules.user.infrastructure.models import User
from app.modules.user.infrastructure.repository import UserRepository


class NoteService(Service):

    def __init__(self, repository, search_service=None, storage=None):
        super().__init__(repository)
        self.storage = storage
        self.search_service = search_service

    def indexing_note(self, note):
        note_document = NoteDocument(
            id=note.hash_id,
            title=note.title,
            content=re.sub(r"<[^>]+>", "", note.content or ""),
            tags=[x.keyword for x in note.tags],
            user_hash=note.user.hash_id,
            is_deleted=note.deleted_at is not None,
            created_at=note.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            updated_at=note.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        )
        self.search_service.add_to_index(asdict(note_document))

    def _get_owned_note(self, user_id, note_hash: str) -> Note:
        note = self.repository.get_by_hash_id(hash_id=note_hash)
        if note is None:
            raise ValueError("노트를 찾을 수 없습니다.")
        if note.user_id != user_id:
            raise ValueError("노트를 찾을 수 없습니다.")
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
            raise ValueError("노트를 찾을 수 없습니다.")
        return note_snapshot

    def list_notes(self, user_hash: str, keyword: str | None, is_deleted: bool, page: int, tag: str | None = None,
                   sort: str | None = None) -> \
            List[NoteEntity]:
        if keyword is None:
            notes = self.repository.list_note_by_user_hash(user_hash, is_deleted, tag, sort, page)
        else:
            note_hashes = self.search_service.find_documents(keyword, user_hash, sort, page)
            notes = self.repository.get_by_hash_ids_and_user_id(note_hashes=note_hashes, user_hash=user_hash)

        for note in notes:
            if note.is_encrypted:
                note.content = self._decrypt_content(note.user, note.content)
        return notes

    def create_default_note(self, user_id: int):
        default_note = NoteEntity(
            user_id=user_id,
            title="",
            content="<p></p>"
        )
        note = self.repository.create_note(default_note)
        self.indexing_note(note)
        return note

    def get_note_by_hash_id(self, user_id: int | None, note_hash: str, password: str | None = None):
        note = self.repository.get_by_hash_id(hash_id=note_hash)
        if note is None or (not note.is_public and user_id is None):
            raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

        note_password = self._decrypt_content(note.user, note.password) if note.password else None
        if note.user_id != user_id and note.password:
            if note_password != password:
                raise HTTPException(status_code=403, detail={
                    "message": "비밀번호가 일치하지 않습니다.",
                    "is_password": True
                })

        note.is_editable = False
        if user_id:
            user = UserRepository(self.repository.db).get_by_pk(user_id)
            workspaces = self.repository.get_shared_workspace(
                workspace_hashes=[x.hash_id for x in note.workspaces],
                user_id=user.pk)

            if not user.is_superuser and not workspaces and note.user_id != user.pk:
                raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

            if note.password:
                note.password = note_password
            note.is_editable = note.user_id == user.pk or user.is_superuser or bool(workspaces)

        if note.is_encrypted:
            note.content = self._decrypt_content(note.user, note.content)
        return note

    def update_note(self, user: User, note_hash: str, request):
        note = self.repository.get_by_hash_id(hash_id=note_hash)

        content = request.content or (
            self._decrypt_content(user, note.content) if note.is_encrypted else note.content)

        is_encrypted = request.is_encrypted if request.is_encrypted is not None else note.is_encrypted
        if is_encrypted:
            content = self._encrypt_content(user, content)

        workspaces = self.repository.get_shared_workspace(
            workspace_hashes=[x.hash_id for x in note.workspaces],
            user_id=user.pk)

        if not user.is_superuser and not workspaces and note.user_id != user.pk:
            raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

        is_editable = note.user_id == user.pk or user.is_superuser or bool(workspaces)
        if not is_editable:
            raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

        note.is_editable = is_editable

        password = None
        if request.password:
            password = self._encrypt_content(user, request.password)

        note = self.repository.update_note(user_id=user.pk,
                                           note=note,
                                           title=request.title,
                                           content=content,
                                           is_public=request.is_public,
                                           is_protected=request.is_protected,
                                           is_encrypted=request.is_encrypted,
                                           password=password,
                                           tags=request.tags,
                                           workspaces=request.workspaces)
        snapshot_policy = note.user.preference.snapshot_policy
        if ((snapshot_policy == "ON_FIRST_EDIT" and request.is_first_edit)
                or snapshot_policy == "ON_EVERY_EDIT"
                or bool(workspaces)):
            self.repository.add_note_snapshot(description=f"auto_{int(note.updated_at.timestamp())}_by_{user.name}",
                                              note=note)
        if request.is_encrypted:
            note.content = self._decrypt_content(user, content)
        if request.password:
            note.password = self._decrypt_content(user, password)

        self.indexing_note(note)
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
                content = self._replace_outside_codeblock(content)

            note_entity = NoteEntity(
                user_id=user_id,
                title=title,
                content=markdown(content, extensions=['fenced_code'])
            )
            note = self.repository.create_note(note_entity)
            self.indexing_note(note)

        return ["filepath"]

    async def download_note(self, user_hash: str, note_hashes: list, file_format: str = "md"):
        notes = self.repository.get_by_hash_ids_and_user_id(note_hashes=note_hashes, user_hash=user_hash)

        if not notes:
            raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

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

    MEDIA_TYPES = {
        "md": "text/markdown",
        "pdf": "application/pdf",
    }

    def _render_note(self, note, file_format: str) -> bytes:
        """노트 본문을 요청한 형식의 바이트로 만든다. 암호화된 노트는 먼저 복호화한다."""
        content = self._decrypt_content(note.user, note.content) if note.is_encrypted else note.content

        if file_format == "pdf":
            return render_note_pdf(title=note.title, content=content)
        return markdownify(content or "").encode("utf-8")

    @staticmethod
    def _safe_filename(title: str, file_format: str = "md") -> str:
        # 파일명에 쓸 수 없는 문자 제거 (간단 버전)
        invalid_chars = '/\\:*?"<>|'
        cleaned = "".join(c for c in title if c not in invalid_chars).strip() or "제목없음"
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

    @classmethod
    def _replace_outside_codeblock(cls, content):
        # ```로 감싸진 코드블록을 기준으로 분리 (홀수 인덱스가 코드블록)
        parts = re.split(r'(```.*?```)', content, flags=re.DOTALL)

        for i in range(len(parts)):
            if i % 2 == 0:  # 코드블록이 아닌 부분만 치환
                parts[i] = parts[i].replace("\n\n\n", "\n\n&nbsp;\n\n")

        return "".join(parts)

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
