import re
from dataclasses import asdict
from datetime import datetime
from typing import List

import fitz
from markdown import markdown
from fastapi_clean_archi.core.commons.service import Service

from app.modules.note.domain.entity import NoteEntity, NoteDocument


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
        note = self.repository.get_by_hash_id(hash_id=note_hash)
        if note is None:
            raise ValueError("노트를 찾을 수 없습니다.")

        if note.user_id != user_id:
            raise ValueError("노트를 찾을 수 없습니다.")

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
                content = re.sub(r"\n{1}", "\n\n", content)
            else:
                content = content.decode("utf-8")
                file_format = file.filename.split(".")[-1]
                if file_format in ["sh", "py", "js", "java", "c", "cpp", "go", "rb",
                                   "html", "css", "json", "xml", "yaml", "yml",
                                   "ini", "conf", "cfg", "toml"]:
                    content = ["- \n", "<pre>", content, "</pre>"]
                    content = "\n".join(content)

            note_entity = NoteEntity(
                user_id=user_id,
                title=title,
                content=markdown(content)
            )
            note = self.repository.create_note(note_entity)
            self.indexing_note(note)

        return ["filepath"]
