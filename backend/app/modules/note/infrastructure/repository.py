import os
from datetime import datetime, timezone
from typing import List, Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import desc, asc
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.modules.note.domain.entity import SnapshotEntity
from app.modules.note.infrastructure.models import Note
from app.modules.note.infrastructure.models import NoteSnapshot
from app.modules.tag.infrastructure.models import Tag
from app.modules.user.infrastructure.models import User
from app.modules.workspace.infrastructure.models import Workspace, workspace_member


class NoteRepository(Repository):
    DB_MODEL = Note
    PAGE_SIZE = 20

    def list_note_by_user_hash(self, user_hash: int, is_deleted=False, tag=None, sort=None, page=1):
        queryset = self.db.query(self.DB_MODEL).join(self.DB_MODEL.user).options(
            joinedload(self.DB_MODEL.tags)
        ).filter(
            User.hash_id == user_hash,
        )

        queryset = queryset.filter(self.DB_MODEL.deleted_at.isnot(None) if is_deleted
                                   else self.DB_MODEL.deleted_at.is_(None))

        if tag:
            queryset = queryset.join(self.DB_MODEL.tags).filter(Tag.keyword == tag)

        if is_deleted:
            queryset = queryset.order_by(desc(self.DB_MODEL.deleted_at), desc(self.DB_MODEL.updated_at))
        else:
            queryset = queryset.order_by(
                desc(self.DB_MODEL.updated_at) if sort == "-updated_at"
                else asc(self.DB_MODEL.created_at) if sort == "created_at"
                else desc(self.DB_MODEL.created_at)
            )

        offset = (page - 1) * self.PAGE_SIZE  # page=1 이면 0부터 시작

        return queryset.offset(offset).limit(self.PAGE_SIZE).all()

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

    def get_shared_workspace(self, workspace_hashes: list, user_id: int):
        if not workspace_hashes or not user_id:
            return []

        instances = self.db.query(Workspace).join(
            workspace_member, workspace_member.c.workspace_id == Workspace.pk
        ).filter(
            Workspace.hash_id.in_(workspace_hashes),
            workspace_member.c.user_id == user_id,
        ).all()
        return instances

    def update_note(self, user_id: int, note: Note,
                    title=None,
                    content=None,
                    is_public=None,
                    is_protected=None,
                    is_encrypted=None,
                    password=None,
                    tags=None,
                    workspaces=None):
        if title is not None:
            note.title = title
        if content is not None:
            note.content = content
        if is_public is not None:
            note.is_public = is_public
        if is_protected is not None:
            note.is_protected = is_protected
        if is_encrypted is not None:
            note.is_encrypted = is_encrypted
        if password is not None:
            note.password = password

        if tags is not None:
            existing_tags = self.db.query(Tag).filter(Tag.keyword.in_(tags)).all()

            existing_keywords = {tag.keyword for tag in existing_tags}
            new_tags = [Tag(keyword=k) for k in tags if k not in existing_keywords]
            self.db.add_all(new_tags)
            self.db.flush()
            note.tags = existing_tags + new_tags

        if workspaces is not None:
            workspaces = self.db.query(Workspace).filter(Workspace.hash_id.in_(workspaces)).all()
            note.workspaces = workspaces

        self.db.commit()
        self.db.refresh(note)
        return note

    def get_note_snapshot_by_hash_id(self, user_id, hash_id: str):
        instance = self.db.query(NoteSnapshot).join(NoteSnapshot.note).filter(
            Note.pk == NoteSnapshot.note_id,
            Note.user_id == user_id,
            NoteSnapshot.hash_id == hash_id).first()
        return instance

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                       self.DB_MODEL.hash_id == hash_id).first()
        return instance

    def get_by_hash_ids_and_user_id(self, note_hashes: List[str], user_hash: str | None = None):
        filter_criterion = [self.DB_MODEL.hash_id.in_(note_hashes)]
        if user_hash:
            filter_criterion.append(
                User.hash_id == user_hash
            )
        instances = self.db.query(self.DB_MODEL).join(self.DB_MODEL.user).filter(
            *filter_criterion
        ).all()
        return instances

    def soft_delete_note(self, user_id: int, note_hashes: List[str]):
        current_date = datetime.now(timezone.utc)
        notes = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                    self.DB_MODEL.hash_id.in_(note_hashes)).all()
        for note in notes:
            note.deleted_at = current_date

        self.db.commit()
        for note in notes:
            self.db.refresh(note)
        return notes

    def hard_delete_note(self, user_id: int, note_hashes: List[str]):
        notes = self.db.query(self.DB_MODEL).options(
            joinedload(self.DB_MODEL.snapshot)
        ).filter(
            self.DB_MODEL.user_id == user_id,
            self.DB_MODEL.hash_id.in_(note_hashes)
        ).all()
        for note in notes:
            self.db.delete(note)
        self.db.commit()

    def find_expired_trash_notes(self, user, cutoff: datetime):
        return self.db.query(self.DB_MODEL).options(
            joinedload(self.DB_MODEL.snapshot)
        ).filter(
            self.DB_MODEL.user_id == user.pk,
            self.DB_MODEL.deleted_at.isnot(None),
            self.DB_MODEL.deleted_at < cutoff,
        ).all()

    def hard_delete_notes(self, notes: List[Note]):
        for note in notes:
            self.db.delete(note)
        self.db.commit()

    def restore_note(self, user_id: int, note_hashes: List[str]):
        notes = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                    self.DB_MODEL.hash_id.in_(note_hashes)).all()
        for note in notes:
            note.deleted_at = None

        self.db.commit()
        for note in notes:
            self.db.refresh(note)
        return notes

    def find_note_snapshots(self, note_hash: str):
        queryset = self.db.query(NoteSnapshot).join(NoteSnapshot.note).filter(
            Note.hash_id == note_hash,
        ).order_by(desc(NoteSnapshot.created_at)).all()
        return [SnapshotEntity.from_orm(snapshot) for snapshot in queryset]

    def add_note_snapshot(self, description: str, note: Note):
        timestamp = int(datetime.now().timestamp() * 1000)
        snapshot = NoteSnapshot(note_id=note.pk,
                                description=description or f"auto_{timestamp}",
                                title=note.title,
                                content=note.content)
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def remove_note_snapshot(self, note_snapshot: NoteSnapshot):
        self.db.delete(note_snapshot)
        self.db.commit()
