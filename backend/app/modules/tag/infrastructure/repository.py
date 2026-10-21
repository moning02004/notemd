from typing import List

from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import func, and_

from app.modules.note.infrastructure.models import Note
from app.modules.tag.infrastructure.models import Tag, notetag


class TagRepository(Repository):
    DB_MODEL = Tag

    def list_tags(self) -> list:
        return self.db.query(self.DB_MODEL).all()

    def list_tags_with_note_count(self, user, total) -> List:
        # 태그별 non-deleted 노트 수를 서브쿼리로 직접 집계
        note_count_subq = (
            self.db.query(
                notetag.c.tag_id,
                func.count().label("note_count")
            )
            .join(Note, and_(Note.pk == notetag.c.note_id,
                             Note.user_id == user.pk,
                             Note.deleted_at.is_(None)))
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
            # Query.count() 는 노트 열 전부를 고르는 서브쿼리를 감싸 센다. 개수만 세면 인덱스만 읽고 끝난다.
            all_tag.count = self.db.query(func.count()).select_from(Note).filter(
                Note.user_id == user.pk, Note.deleted_at.is_(None)).scalar()
            filtered_tags = [all_tag] + filtered_tags

        return filtered_tags
