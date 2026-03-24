from typing import List

from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import desc, asc

from app.modules.note.infrastructure.models import Note
from app.modules.tag.infrastructure.models import Tag
from app.modules.user.infrastructure.models import User

from app.modules.note.infrastructure.models import NoteSnapshot


class NoteRepository(Repository):
    DB_MODEL = Note

    def list_note_by_user_hash(self, user_hash: int, is_deleted=False, tag=None, sort=None, page=1):
        queryset = self.db.query(self.DB_MODEL).join(self.DB_MODEL.user).filter(
            User.hash_id == user_hash,
            self.DB_MODEL.is_deleted == is_deleted,
        )

        if tag:
            queryset = queryset.join(self.DB_MODEL.tags).filter(Tag.keyword == tag)

        if sort:
            queryset = queryset.order_by(
                desc(self.DB_MODEL.updated_at) if sort == "-updated_at"
                else asc(self.DB_MODEL.created_at) if sort == "created_at"
                else desc(self.DB_MODEL.created_at)
            )

        page_size = 20
        offset = (page - 1) * page_size  # page=1 이면 0부터 시작
        return queryset.offset(offset).limit(page_size).all()

    def create_note(self, note_entity) -> Note:
        new_note = self.DB_MODEL(user_id=note_entity.user_id,
                                 title=note_entity.title,
                                 content=note_entity.content)
        self.db.add(new_note)
        self.db.flush()

        snapshot = NoteSnapshot(note_id=new_note.id, title=note_entity.title, content=note_entity.content)
        self.db.add(snapshot)
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
                instance.tags = existing_tags + new_tags

            self.db.commit()
            self.db.refresh(instance)
        return instance

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                       self.DB_MODEL.hash_id == hash_id).first()
        return instance

    def get_by_hash_ids_and_user_id(self, user_hash: str, note_hashes: List[str]):
        instances = self.db.query(self.DB_MODEL).join(self.DB_MODEL.user).filter(
            User.hash_id == user_hash,
            self.DB_MODEL.hash_id.in_(note_hashes)
        ).all()
        return instances

    def soft_delete_note(self, user_id: int, note_hashes: str):
        notes = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                   self.DB_MODEL.hash_id.in_(note_hashes)).all()
        for note in notes:
            if note and not note.is_deleted:
                note.is_deleted = True
        self.db.commit()
        [self.db.refresh(note) for note in notes]
        return notes

    def hard_delete_note(self, user_id: int, hash_id: str):
        note = self.get_by_hash_id_and_user_id(user_id=user_id, hash_id=hash_id)
        if note:
            self.db.delete(note)
            self.db.commit()
        return note

    def restore_note(self, user_id: int, hash_id: str):
        note = self.get_by_hash_id_and_user_id(user_id=user_id, hash_id=hash_id)
        if note and note.is_deleted:
            note.is_deleted = False
            self.db.commit()
            self.db.refresh(note)
        return note
