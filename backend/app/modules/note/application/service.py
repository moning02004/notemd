from fastapi_clean_archi.core.commons.service import Service

from app.modules.note.domain.entity import NoteEntity
from app.modules.note.infrastructure.repository import NoteRepository


class NoteService(Service):

    def list_notes(self, user_id: int):
        notes = self.repository.list_by_user_id(user_id)
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

        if user_id and note.user_id != user_id:
            return None
        return note

    def update_note(self, user_id: int, note_id: str, request):
        return self.repository.update_note(user_id=user_id, hash_id=note_id, request=request)

    def soft_delete_note(self, user_id: int, note_id: str):
        note = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=note_id)
        if note:
            note.is_deleted = True
            self.repository.db.commit()
            self.repository.db.refresh(note)
        return note

    def hard_delete_note(self, user_id: int, note_id: str):
        note = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=note_id)
        if note:
            self.repository.db.delete(note)
            self.repository.db.commit()
        return note

    def restore_note(self, user_id: int, note_id: str):
        note = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=note_id)
        if note and note.is_deleted:
            note.is_deleted = False
            self.repository.db.commit()
            self.repository.db.refresh(note)
        return note
