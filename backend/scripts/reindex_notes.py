"""모든 노트를 검색 색인에 다시 쓴다.

색인 문서의 모양이 바뀌면(폴더 hash 추가, 암호화 노트의 본문 빼기 등) 이미 색인된 노트는 예전 모양으로 남는다.
노트를 하나씩 다시 색인해 지금 모양으로 맞춘다. DB 는 건드리지 않고, 몇 번을 돌려도 결과는 같다.
(암호화 노트만 다시 쓰던 backfill_encrypted_search_index 가 하던 일도 여기에 들어 있다.)

사용법 (컨테이너 안에서):
    python3 -m scripts.reindex_notes --dry-run
    python3 -m scripts.reindex_notes
    make backfill SCRIPT=reindex_notes
"""
import argparse
import logging
from dataclasses import asdict

from sqlalchemy import func, select

from app.core.session import SessionLocal
from app.modules.note.domain.entity import build_note_document
from app.modules.note.infrastructure.models import Note
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository
from scripts import _base  # noqa: F401  모든 모듈의 모델을 불러 둔다(relationship 의 문자열 참조).

logger = logging.getLogger("reindex_notes")


def run(batch_size: int, dry_run: bool) -> int:
    db = SessionLocal()
    try:
        total = db.execute(select(func.count()).select_from(Note)).scalar()
        if dry_run or not total:
            logger.info("%s%d건 발견.", "[dry-run] " if dry_run else "", total)
            return 0

        # 필터 속성(folder 등)이 색인 설정에 들어가 있어야 한다. 앱이 한 번도 뜨지 않은 채 돌려도 되게 여기서도 맞춘다.
        SearchRepository().ensure_index()
        search_service = SearchService(SearchRepository())
        done, last_pk = 0, 0
        while True:
            notes = db.query(Note).filter(Note.pk > last_pk).order_by(Note.pk).limit(batch_size).all()
            if not notes:
                break
            search_service.add_to_index([asdict(build_note_document(note)) for note in notes])
            last_pk = notes[-1].pk
            done += len(notes)
            db.expunge_all()
            logger.info("%d건 처리 (누적 %d/%d)", len(notes), done, total)
        return done
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="reindex_notes")
    parser.add_argument("--batch-size", type=int, default=200)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    logger.info("완료. 총 %d건 다시 색인.", run(args.batch_size, args.dry_run))
