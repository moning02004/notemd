from datetime import datetime, timedelta, timezone

from app.core.celery_app import celery_app
from app.core.session import SessionLocal
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.preference.infrastructure.models import Preference
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository


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
