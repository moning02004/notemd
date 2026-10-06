"""암호화 노트의 검색 색인 다시 쓰기.

암호화한 노트는 색인에 본문을 넣지 않는다(제목·태그만). 그렇게 바뀌기 전에 저장된 암호화 노트는
색인에 본문 평문이 남아 있으므로, 한 번씩 다시 색인해 지운다. DB 는 건드리지 않는다.

다른 백필과 달리 '아직 안 채워진 row' 를 가릴 수 없다(색인에 무엇이 들었는지는 DB 로 알 수 없다).
그래서 pk 순서로 한 번 훑는다. 같은 문서를 덮어쓰는 것이라 몇 번을 돌려도 결과는 같다.

사용법 (컨테이너 안에서):
    python3 -m scripts.backfill_encrypted_search_index --dry-run
    python3 -m scripts.backfill_encrypted_search_index --env prod
    make backfill SCRIPT=backfill_encrypted_search_index ARGS="--env prod"
"""
from dataclasses import asdict

from sqlalchemy import select

from app.core.session import SessionLocal
from app.modules.note.domain.entity import build_note_document
from app.modules.note.infrastructure.models import Note
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository
from scripts._base import BackfillScript


class BackfillEncryptedSearchIndex(BackfillScript):
    name = "backfill_encrypted_search_index"
    target_table = Note

    def __init__(self):
        super().__init__()
        self.search_service = None

    def unfilled_condition(self):
        return Note.is_encrypted.is_(True)

    def key_columns(self):
        return (Note.pk,)

    def apply(self, db, row):
        note = db.get(Note, row.pk)
        self.search_service.add_to_index(asdict(build_note_document(note)))

    def run(self, batch_size: int, dry_run: bool) -> int:
        db = SessionLocal()
        try:
            target_count = self._count_target(db)
            if target_count == 0 or dry_run:
                self.logger.info("%s%d건 발견.", "[dry-run] " if dry_run else "", target_count)
                return target_count if dry_run else 0

            self.search_service = SearchService(SearchRepository())
            total, last_pk = 0, 0
            while True:
                rows = db.execute(
                    select(Note.pk).where(self.unfilled_condition(), Note.pk > last_pk)
                    .order_by(Note.pk).limit(batch_size)
                ).all()
                if not rows:
                    break

                for row in rows:
                    self.apply(db, row)

                last_pk = rows[-1].pk
                total += len(rows)
                self.logger.info("%d건 처리 (누적 %d/%d)", len(rows), total, target_count)

            return total
        finally:
            db.close()


if __name__ == "__main__":
    BackfillEncryptedSearchIndex().main()
