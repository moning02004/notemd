import logging
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.session import SessionLocal
from app.core.storages import get_storage
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.models import Note
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.preference.infrastructure.models import Preference
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository
from app.modules.user.infrastructure.models import User

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")
BACKUP_PREFIX = "note.md-"


@celery_app.task(name="app.modules.note.application.tasks.purge_expired_trash_notes")
def purge_expired_trash_notes():
    db = SessionLocal()

    try:
        note_repository = NoteRepository(db)
        preferences = db.query(Preference).filter(Preference.trash_policy != "NEVER").all()
        for preference in preferences:
            day = int(preference.trash_policy.split("_")[0])
            cutoff = datetime.now(timezone.utc) - timedelta(days=day)
            notes = note_repository.find_expired_trash_notes(preference.user, cutoff)
            note_hashes = [note.hash_id for note in notes]
            if note_hashes:
                note_repository.hard_delete_notes(notes)
                SearchService(SearchRepository()).delete_from_index(doc_ids=note_hashes)
    finally:
        db.close()


def _backup_dir_name(user: User) -> str:
    """사용자별 백업 폴더 이름. 계정 이름을 그대로 쓰되 경로로 읽힐 글자는 바꾼다. 겹치지 않게 pk 를 붙인다."""
    return f"{re.sub(r'[^0-9A-Za-z가-힣._-]', '_', user.username).strip('.') or 'user'}-{user.pk}"


@celery_app.task(name="app.modules.note.application.tasks.backup_notes")
def backup_notes():
    """사용자마다 '전체 내보내기' zip 을 BACKUP_DIR/<계정>/ 에 남긴다. 돌려준 값은 이번에 쓴 파일 수.

    설정의 데이터 내보내기와 같은 zip 이다(노트·스냅샷·템플릿·이미지, 암호화한 노트는 풀어서).
    노트가 하나도 없는 계정은 건너뛴다. 사용자마다 최근 BACKUP_KEEP 개만 남기고 오래된 것은 지운다.
    한 사람의 백업이 실패해도 나머지는 이어서 한다.
    """
    if not settings.BACKUP_DIR:
        return 0

    root = Path(settings.BACKUP_DIR)
    stamp = datetime.now(KST).strftime("%Y%m%d-%H%M%S")
    written = 0

    db = SessionLocal()
    try:
        service = NoteService(NoteRepository(db), storage=get_storage())
        user_ids = [pk for (pk,) in db.query(Note.user_id).filter(Note.deleted_at.is_(None)).distinct()]
        for user in db.query(User).filter(User.pk.in_(user_ids)).order_by(User.pk).all():
            try:
                directory = root / _backup_dir_name(user)
                directory.mkdir(parents=True, exist_ok=True)
                target = directory / f"{BACKUP_PREFIX}{stamp}.zip"
                # 쓰다 만 파일이 백업처럼 남지 않게, 다 쓴 뒤에 이름을 바꾼다.
                partial = target.with_suffix(".zip.part")
                partial.write_bytes(service.export_notes(user).content)
                os.replace(partial, target)
                written += 1

                backups = sorted(directory.glob(f"{BACKUP_PREFIX}*.zip"))
                for old in backups[:max(len(backups) - max(settings.BACKUP_KEEP, 1), 0)]:
                    old.unlink()
            except Exception:
                logger.exception("백업 실패: user=%s", user.pk)
    finally:
        db.close()
    return written
