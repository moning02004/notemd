from datetime import datetime, timezone
from typing import List

from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.modules.folder.infrastructure.models import Folder
from app.modules.note.infrastructure.models import Note


class FolderRepository(Repository):
    DB_MODEL = Folder

    def list_by_user_id(self, user_id: int) -> List[Folder]:
        return (self.db.query(self.DB_MODEL)
                .filter(self.DB_MODEL.user_id == user_id)
                .all())

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str) -> Folder | None:
        return (self.db.query(self.DB_MODEL)
                .filter(self.DB_MODEL.user_id == user_id, self.DB_MODEL.hash_id == hash_id)
                .first())

    def create_folder(self, folder_entity) -> Folder:
        folder = self.DB_MODEL(user_id=folder_entity.user_id,
                               name=folder_entity.name,
                               parent_id=folder_entity.parent_id)
        self.db.add(folder)
        self.db.commit()
        self.db.refresh(folder)
        return folder

    def update_folder(self, folder: Folder, name=None, parent_id=-1) -> Folder:
        """parent_id 의 기본값이 -1 인 이유: None 이 '최상위로 옮긴다'는 뜻이라
        '건드리지 않는다'와 구분해야 한다."""
        if name is not None:
            folder.name = name
        if parent_id != -1:
            folder.parent_id = parent_id
        self.db.commit()
        self.db.refresh(folder)
        return folder

    def delete_folder(self, folder: Folder) -> None:
        self.db.delete(folder)
        self.db.commit()

    def note_count_by_folder(self, user_id: int) -> dict:
        """폴더별 직속 노트 수. 휴지통에 있는 노트는 세지 않는다."""
        rows = (self.db.query(Note.folder_id, func.count(Note.pk))
                .filter(Note.user_id == user_id,
                        Note.deleted_at.is_(None),
                        Note.folder_id.isnot(None))
                .group_by(Note.folder_id)
                .all())
        return {folder_id: count for folder_id, count in rows}

    def unfiled_note_count(self, user_id: int) -> int:
        return (self.db.query(func.count(Note.pk))
                .filter(Note.user_id == user_id,
                        Note.deleted_at.is_(None),
                        Note.folder_id.is_(None))
                .scalar()) or 0

    def find_notes_in_folders(self, user_id: int, folder_ids: List[int]) -> List[Note]:
        if not folder_ids:
            return []
        return (self.db.query(Note)
                .options(joinedload(Note.tags), joinedload(Note.user))
                .filter(Note.user_id == user_id,
                        Note.deleted_at.is_(None),
                        Note.folder_id.in_(folder_ids))
                .all())

    def find_unfiled_notes_with_tags(self, user_id: int) -> List[Note]:
        """아직 폴더가 없는 노트와 그 태그. 태그로 폴더를 만들어 줄 때 쓴다."""
        return (self.db.query(Note)
                .options(joinedload(Note.tags))
                .filter(Note.user_id == user_id,
                        Note.deleted_at.is_(None),
                        Note.folder_id.is_(None))
                .all())

    def soft_delete_notes(self, notes: List[Note]) -> List[Note]:
        current_date = datetime.now(timezone.utc)
        for note in notes:
            note.deleted_at = current_date
        self.db.commit()
        for note in notes:
            self.db.refresh(note)
        return notes

    def move_notes(self, user_id: int, note_hashes: List[str], folder_id: int | None) -> List[Note]:
        notes = (self.db.query(Note)
                 .options(joinedload(Note.tags), joinedload(Note.user))
                 .filter(Note.user_id == user_id, Note.hash_id.in_(note_hashes))
                 .all())
        for note in notes:
            note.folder_id = folder_id
        self.db.commit()
        for note in notes:
            self.db.refresh(note)
        return notes
