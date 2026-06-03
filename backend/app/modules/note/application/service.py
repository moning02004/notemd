from typing import List

from fastapi_clean_archi.core.commons.service import Service

from app.modules.note.domain.entity import NoteEntity


class NoteService(Service):

    def __init__(self, repository, storage=None):
        super().__init__(repository)
        self.storage = storage

    def list_notes(self, user_id: int, is_deleted: bool, page: int, tag: str | None = None, sort: str | None = None) -> List[NoteEntity]:
        notes = self.repository.list_note_by_user_id(user_id, is_deleted, tag, sort, page)
        return notes

    def create_default_note(self, user_id: int):
        default_note = NoteEntity(
            user_id=user_id,
            title="",
            content=""
        )
        return self.repository.create_note(default_note)

    def get_note_by_hash_id(self, user_id: int | None, note_id: str):
        note = self.repository.get_by_hash_id(hash_id=note_id)
        if note is None:
            return None

        if not note.is_public and user_id is None:
            return None

        if not note.is_public and user_id is None:
            return None

        if user_id and note.user_id != user_id:
            return None

        return note

    def update_note(self, user_id: int, note_id: str, request):
        return self.repository.update_note(user_id=user_id, hash_id=note_id, request=request)

    async def create_note_image(self, user_id, note_id: str, file):
        note = self.repository.get_by_hash_id(hash_id=note_id)
        if note is None:
            raise ValueError("노트를 찾을 수 없습니다.")

        if note.user_id != user_id:
            raise ValueError("노트를 찾을 수 없습니다.")

        filepath = await self.storage.save(file, note_id=note_id)
        return {
            "url": filepath
        }

    def soft_delete_note(self, user_id: int, note_id: str):
        note = self.repository.soft_delete_note(user_id=user_id, hash_id=note_id)
        return note

    def hard_delete_note(self, user_id: int, note_id: str):
        note = self.repository.hard_delete_note(user_id=user_id, hash_id=note_id)
        return note

    def restore_note(self, user_id: int, note_id: str):
        note = self.repository.restore_note(user_id=user_id, hash_id=note_id)
        return note
