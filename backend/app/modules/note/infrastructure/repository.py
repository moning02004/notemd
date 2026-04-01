from app.modules.note.infrastructure.models import Note, Tag
from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import desc


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

            if request.tags is not None:
                tag_keywords = request.tags

                existing_tags = self.db.query(Tag).filter(Tag.keyword.in_(tag_keywords)).all()

                existing_keywords = {tag.keyword for tag in existing_tags}
                new_tags = [Tag(keyword=k) for k in tag_keywords if k not in existing_keywords]
                self.db.add_all(new_tags)
                self.db.flush()
                instance.tags.extend(existing_tags + new_tags)

            self.db.commit()
            self.db.refresh(instance)
        return instance

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                       self.DB_MODEL.hash_id == hash_id).first()
        return instance
