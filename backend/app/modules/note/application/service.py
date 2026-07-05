import io
import re
import zipfile
from dataclasses import asdict
from datetime import datetime
from typing import List

import fitz
from fastapi_clean_archi.core.commons.service import Service
from markdown import markdown
from markdownify import markdownify

from app.modules.note.domain.entity import NoteEntity, NoteDocument, DownloadResult
from app.modules.note.infrastructure.models import Note, NoteSnapshot


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

    def _get_owned_snapshot(self, user_id, note_snapshot_hash: str) -> Note:
        note_snapshot = self.repository.get_note_snapshot_by_hash_id(user_id=user_id, hash_id=note_snapshot_hash)
        if note_snapshot is None:
            raise ValueError("노트를 찾을 수 없습니다.")
        return note_snapshot

    def list_notes(self, user_hash: str, keyword: str, is_deleted: bool, page: int, tag: str | None = None,
                   sort: str | None = None) -> \
            List[NoteEntity]:
        if keyword is None:
            notes = self.repository.list_note_by_user_hash(user_hash, is_deleted, tag, sort, page)
        else:
            note_hashes = self.search_service.find_documents(keyword, user_hash, sort, page)
            notes = self.repository.get_by_hash_ids_and_user_id(user_hash, note_hashes)
        return notes

    def create_default_note(self, user_id: int):
        default_note = NoteEntity(
            user_id=user_id,
            title="",
            content=""
        )
        note = self.repository.create_note(default_note)
        self.indexing_note(note)
        return note

    def get_note_by_hash_id(self, user_id: int | None, note_hash: str):
        note = self.repository.get_by_hash_id(hash_id=note_hash)

        if note is None:
            return None
        if not note.is_public and user_id is None:
            return None
        if not note.is_public and user_id is None:
            return None
        if user_id and note.user_id != user_id:
            return None
        self.indexing_note(note)
        return note

    def update_note(self, user_id: int, note_hash: str, request):
        note = self.repository.update_note(user_id=user_id, hash_id=note_hash, request=request)
        self.indexing_note(note)
        return note

    def soft_delete_note(self, user_id: int, note_hashes: list):
        notes = self.repository.soft_delete_note(user_id=user_id, note_hashes=note_hashes)
        [self.indexing_note(note) for note in notes]
        return [x.hash_id for x in notes]

    def hard_delete_note(self, user_id: int, note_hash: str):
        note = self.repository.hard_delete_note(user_id=user_id, hash_id=note_hash)
        self.search_service.delete_from_index(doc_id=note_hash)
        return note

    def restore_note(self, user_id: int, note_hash: str):
        note = self.repository.restore_note(user_id=user_id, hash_id=note_hash)
        self.indexing_note(note)
        return note

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

    async def download_note(self, user_hash: str, note_hashes: list):
        notes = self.repository.get_by_hash_ids_and_user_id(user_hash=user_hash, note_hashes=note_hashes)

        if not notes:
            raise ValueError("No notes found")  # 또는 커스텀 예외

        if len(notes) == 1:
            note = notes[0]
            return DownloadResult(
                content=markdownify(note.content).encode("utf-8"),
                media_type="text/markdown",
                filename=self._safe_filename(note.title),
            )

        # 둘 이상 -> zip
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            used_names = set()
            for note in notes:
                filename = self._unique_filename(note.title, used_names)
                zf.writestr(filename, note.content)

        buffer.seek(0)
        return DownloadResult(
            content=buffer.getvalue(),
            media_type="application/zip",
            filename="notes.zip",
        )

    @staticmethod
    def _safe_filename(title: str) -> str:
        # 파일명에 쓸 수 없는 문자 제거 (간단 버전)
        invalid_chars = '/\\:*?"<>|'
        cleaned = "".join(c for c in title if c not in invalid_chars).strip() or "제목없음"
        if cleaned.endswith(".md"):
            cleaned = cleaned[:-3]
        return f"{cleaned}.md"

    @classmethod
    def _unique_filename(cls, title: str, used_names: set) -> str:
        base = cls._safe_filename(title)
        filename = f"{base}.md"
        i = 1
        while filename in used_names:
            filename = f"{base}_{i}.md"
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
        return snapshots

    def create_note_snapshot(self, user_id, note_hash, name, description) -> NoteSnapshot:
        note = self._get_owned_note(user_id, note_hash)
        snapshot = self.repository.add_note_snapshot(description=description, note=note)
        return snapshot

    def delete_note_snapshot(self, user_id, note_snapshot_hash):
        note_snapshot = self._get_owned_snapshot(user_id, note_snapshot_hash)
        self.repository.remove_note_snapshot(note_snapshot)
