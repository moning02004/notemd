from typing import List

from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import func, and_

from app.modules.note.infrastructure.models import Note
from app.modules.tag.infrastructure.models import Tag, notetag


class TagRepository(Repository):
    DB_MODEL = Tag

    def list_tags(self) -> list:
        return self.db.query(self.DB_MODEL).all()

    def list_tags_with_note_count(self, total) -> List:
        # 태그별 non-deleted 노트 수를 서브쿼리로 직접 집계
        note_count_subq = (
            self.db.query(
                notetag.c.tag_id,
                func.count(Note.pk).label("note_count")
            )
            .join(Note, and_(Note.pk == notetag.c.note_id, Note.deleted_at.is_(None)))
            .group_by(notetag.c.tag_id)
            .subquery()
        )

        results = (
            self.db.query(self.DB_MODEL, note_count_subq.c.note_count)
            .join(note_count_subq, note_count_subq.c.tag_id == self.DB_MODEL.pk)
            .all()
        )

        filtered_tags = []
        for tag, count in results:
            tag.count = count
            filtered_tags.append(tag)

        if total:
            all_tag = Tag(keyword="전체")
            all_tag.count = self.db.query(Note).filter(Note.deleted_at.is_(None)).count()
            filtered_tags = [all_tag] + filtered_tags

        return filtered_tags
