from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import desc

from app.modules.note.infrastructure.models import Note


class NoteRepository(Repository):
    DB_MODEL = Note

    def list_by_user_id(self, user_id: int, is_deleted=False):
        instances = self.db.query(self.DB_MODEL).filter(
            self.DB_MODEL.user_id == user_id,
            self.DB_MODEL.is_deleted == is_deleted,
        ).order_by(
            desc(self.DB_MODEL.updated_at)).all()
        return instances

    def create_note(self, note_entity) -> Note:
        new_note = self.DB_MODEL(user_id=note_entity.user_id,
                                 title=note_entity.title,
                                 content=note_entity.content)
        self.db.add(new_note)
        self.db.commit()
        self.db.refresh(new_note)
        return new_note

    def get_by_hash_id(self, hash_id: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.hash_id == hash_id).first()
        return instance

    def update_note(self, user_id: int, hash_id: str, request):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                       self.DB_MODEL.hash_id == hash_id).first()
        if instance:
            if request.title is not None:
                instance.title = request.title
            if request.content is not None:
                instance.content = request.content
            if request.is_public is not None:
                instance.is_public = request.is_public
            if request.is_protected is not None:
                instance.is_protected = request.is_protected
            self.db.commit()
            self.db.refresh(instance)
        return instance

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                       self.DB_MODEL.hash_id == hash_id).first()
        return instance
