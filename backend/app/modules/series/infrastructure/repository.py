from datetime import datetime, timezone
from typing import List

from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import asc, delete, desc, func, insert

from app.modules.note.infrastructure.models import Note
from app.modules.series.infrastructure.models import Series, series_note


class SeriesRepository(Repository):
    DB_MODEL = Series

    def list_by_user_id(self, user_id: int) -> List[Series]:
        return (self.db.query(self.DB_MODEL)
                .filter(self.DB_MODEL.user_id == user_id)
                .order_by(desc(self.DB_MODEL.updated_at), desc(self.DB_MODEL.pk))
                .all())

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str) -> Series | None:
        return (self.db.query(self.DB_MODEL)
                .filter(self.DB_MODEL.user_id == user_id, self.DB_MODEL.hash_id == hash_id)
                .first())

    def note_counts(self, series_ids: List[int]) -> dict:
        """시리즈별 노트 수. 휴지통에 있는 노트는 세지 않는다."""
        if not series_ids:
            return {}
        rows = (self.db.query(series_note.c.series_id, func.count(Note.pk))
                .join(Note, Note.pk == series_note.c.note_id)
                .filter(series_note.c.series_id.in_(series_ids), Note.deleted_at.is_(None))
                .group_by(series_note.c.series_id)
                .all())
        return {series_id: count for series_id, count in rows}

    def notes_of(self, series: Series) -> List[Note]:
        """시리즈의 노트를 순서대로. 휴지통에 있는 노트는 뺀다."""
        return (self.db.query(Note)
                .join(series_note, series_note.c.note_id == Note.pk)
                .filter(series_note.c.series_id == series.pk, Note.deleted_at.is_(None))
                .order_by(asc(series_note.c.position), asc(Note.pk))
                .all())

    def trashed_note_ids_of(self, series: Series) -> List[int]:
        rows = (self.db.query(Note.pk)
                .join(series_note, series_note.c.note_id == Note.pk)
                .filter(series_note.c.series_id == series.pk, Note.deleted_at.isnot(None))
                .order_by(asc(series_note.c.position))
                .all())
        return [pk for (pk,) in rows]

    def owned_notes(self, user_id: int, note_hashes: List[str]) -> List[Note]:
        """내 노트 중 휴지통에 없는 것."""
        if not note_hashes:
            return []
        return (self.db.query(Note)
                .filter(Note.user_id == user_id,
                        Note.hash_id.in_(note_hashes),
                        Note.deleted_at.is_(None))
                .all())

    def series_containing(self, user_id: int, note_id: int) -> List[Series]:
        return (self.db.query(self.DB_MODEL)
                .join(series_note, series_note.c.series_id == self.DB_MODEL.pk)
                .filter(self.DB_MODEL.user_id == user_id, series_note.c.note_id == note_id)
                .order_by(asc(self.DB_MODEL.title), asc(self.DB_MODEL.pk))
                .all())

    def memberships(self, note_ids: List[int]) -> dict:
        """노트 pk → 그 노트가 든 시리즈들({hash_id, title, position, total}). 목록의 '시리즈' 표시가 쓴다.

        몇 번째인지와 전체 수는 휴지통 노트를 뺀 순서로 센다(시리즈 화면·노트 화면과 같다).
        노트마다 묻지 않고, 걸린 시리즈를 한 번에 읽어 파이썬에서 센다.
        """
        if not note_ids:
            return {}
        series_ids = [pk for (pk,) in self.db.query(series_note.c.series_id)
                      .filter(series_note.c.note_id.in_(note_ids)).distinct()]
        if not series_ids:
            return {}

        rows = (self.db.query(self.DB_MODEL.pk, self.DB_MODEL.hash_id, self.DB_MODEL.title, series_note.c.note_id)
                .join(series_note, series_note.c.series_id == self.DB_MODEL.pk)
                .join(Note, Note.pk == series_note.c.note_id)
                .filter(self.DB_MODEL.pk.in_(series_ids), Note.deleted_at.is_(None))
                .order_by(asc(self.DB_MODEL.title), asc(self.DB_MODEL.pk),
                          asc(series_note.c.position), asc(Note.pk))
                .all())

        totals: dict = {}
        for series_id, _, _, _ in rows:
            totals[series_id] = totals.get(series_id, 0) + 1

        wanted, seen, result = set(note_ids), {}, {}
        for series_id, hash_id, title, note_id in rows:
            seen[series_id] = seen.get(series_id, 0) + 1
            if note_id in wanted:
                result.setdefault(note_id, []).append({
                    "hash_id": hash_id, "title": title,
                    "position": seen[series_id], "total": totals[series_id],
                })
        return result

    def create_series(self, user_id: int, title: str, description: str | None, note_ids: List[int]) -> Series:
        series = self.DB_MODEL(user_id=user_id, title=title, description=description)
        self.db.add(series)
        self.db.flush()
        self._write_notes(series, note_ids)
        self.db.commit()
        self.db.refresh(series)
        return series

    def update_series(self, series: Series, title=None, description=None, note_ids=None) -> Series:
        if title is not None:
            series.title = title
        if description is not None:
            series.description = description
        if note_ids is not None:
            self.db.execute(delete(series_note).where(series_note.c.series_id == series.pk))
            self._write_notes(series, note_ids)
            # 노트만 바꿔도 '최근에 고친 시리즈' 로 올라오게 한다.
            series.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(series)
        return series

    def _write_notes(self, series: Series, note_ids: List[int]) -> None:
        if note_ids:
            self.db.execute(insert(series_note),
                            [{"series_id": series.pk, "note_id": note_id, "position": position}
                             for position, note_id in enumerate(note_ids)])

    def delete_series(self, series: Series) -> None:
        # Postgres 는 FK 의 ON DELETE CASCADE 로 지우지만, SQLite 는 FK 를 강제하지 않아 직접 지운다.
        self.db.execute(delete(series_note).where(series_note.c.series_id == series.pk))
        self.db.delete(series)
        self.db.commit()
