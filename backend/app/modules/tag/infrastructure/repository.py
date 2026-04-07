from typing import List

from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy.orm import joinedload

from app.modules.note.infrastructure.models import Note
from app.modules.tag.infrastructure.models import Tag


class TagRepository(Repository):
    DB_MODEL = Tag

    def list_tags(self) -> list:
        return self.db.query(self.DB_MODEL).all()

    def list_tags_with_note_count(self, total) -> List:
        filtered_tags = list()

        tags = self.db.query(self.DB_MODEL).options(joinedload(self.DB_MODEL.notes)).all()
        for tag in tags:
            note_count = len(getattr(tag, "notes", []))
            if note_count:
                tag.count = note_count
                filtered_tags.append(tag)

        if total:
            all_tag = Tag(keyword="전체")
            all_tag.count = self.db.query(Note).count()
            filtered_tags = [all_tag] + filtered_tags
        return filtered_tags
