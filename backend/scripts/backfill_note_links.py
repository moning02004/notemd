"""note_link 백필 스크립트.

백링크는 노트를 저장할 때 본문의 링크를 note_link 표에 옮겨 적어 찾는다. 표를 만들기 전에 저장된 노트는
적힌 게 없으므로, 링크가 있을 수 있는 노트(본문에 data-note 가 있거나 암호화된 노트)를 한 번씩 읽어 채운다.

다른 백필과 달리 '아직 안 채워진 row' 를 가릴 수 없다(링크가 전부 없는 노트를 가리키면 채울 것이 없다).
그래서 pk 순서로 한 번 훑는다. 노트마다 표를 통째로 갈아 적으므로 몇 번을 돌려도 결과는 같다.

사용법 (컨테이너 안에서):
    python3 -m scripts.backfill_note_links --dry-run
    python3 -m scripts.backfill_note_links --env prod
    make backfill SCRIPT=backfill_note_links ARGS="--env prod"
"""
from sqlalchemy import func, or_, select

from app.core.session import SessionLocal
from app.modules.note.application.note_links import note_link_hashes
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.models import Note
from app.modules.note.infrastructure.repository import NoteRepository
from scripts._base import BackfillScript


class BackfillNoteLinks(BackfillScript):
    name = "backfill_note_links"
    target_table = Note

    def unfilled_condition(self):
        return or_(Note.content.like("%data-note%"), Note.is_encrypted.is_(True))

    def key_columns(self):
        return (Note.pk,)

    def apply(self, db, row):
        note = db.get(Note, row.pk)
        content = NoteService._decrypt_content(note.user, note.content) if note.is_encrypted else note.content
        NoteRepository(db).replace_note_links(note, note_link_hashes(content))

    def run(self, batch_size: int, dry_run: bool) -> int:
        db = SessionLocal()
        try:
            target_count = self._count_target(db)
            if target_count == 0 or dry_run:
                self.logger.info("%s%d건 발견.", "[dry-run] " if dry_run else "", target_count)
                return target_count if dry_run else 0

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
                db.commit()

                last_pk = rows[-1].pk
                total += len(rows)
                self.logger.info("%d건 처리 (누적 %d/%d)", len(rows), total, target_count)

            links = db.execute(select(func.count()).select_from(Note.metadata.tables["note_link"])).scalar()
            self.logger.info("note_link 에 %d개의 링크가 있습니다.", links)
            return total
        finally:
            db.close()


if __name__ == "__main__":
    BackfillNoteLinks().main()
