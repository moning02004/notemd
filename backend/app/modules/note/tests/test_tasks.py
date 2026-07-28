from dataclasses import dataclass
from datetime import datetime, timedelta
from unittest.mock import MagicMock

from app.modules.note.application import tasks
from app.modules.note.infrastructure.models import Note
from app.modules.preference.infrastructure.models import Preference
from app.modules.user.infrastructure.models import User


@dataclass
class NoteRef:
    pk: int
    hash_id: str


def make_user(db_session, username):
    user = User(username=username, hashed_password="hashed", name=username)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def make_preference(db_session, user, trash_policy):
    preference = Preference(user_id=user.pk, trash_policy=trash_policy)
    db_session.add(preference)
    db_session.commit()


def make_note(db_session, user, deleted_at=None) -> NoteRef:
    note = Note(user_id=user.pk, title="title", content="content", deleted_at=deleted_at)
    db_session.add(note)
    db_session.commit()
    db_session.refresh(note)
    # purge_expired_trash_notes commits/closes the shared test session, which expires
    # and detaches ORM instances -> capture plain values now, not the ORM object.
    return NoteRef(pk=note.pk, hash_id=note.hash_id)


def make_trashed_note(db_session, user, days_ago) -> NoteRef:
    return make_note(db_session, user, deleted_at=datetime.now() - timedelta(days=days_ago))


def run_purge(monkeypatch, db_session):
    monkeypatch.setattr(tasks, "SessionLocal", lambda: db_session)
    fake_search_service = MagicMock()
    monkeypatch.setattr(tasks, "SearchService", MagicMock(return_value=fake_search_service))
    tasks.purge_expired_trash_notes()
    return fake_search_service


def note_exists(db_session, note_ref: NoteRef) -> bool:
    return db_session.query(Note).filter(Note.pk == note_ref.pk).first() is not None


def test_purge_deletes_notes_past_users_trash_policy(db_session, monkeypatch):
    user = make_user(db_session, "user1")
    make_preference(db_session, user, "15_DAYS")
    expired_note = make_trashed_note(db_session, user, days_ago=20)

    fake_search_service = run_purge(monkeypatch, db_session)

    assert not note_exists(db_session, expired_note)
    fake_search_service.delete_from_index.assert_called_once_with(doc_ids=[expired_note.hash_id])


def test_purge_keeps_notes_within_retention_period(db_session, monkeypatch):
    user = make_user(db_session, "user2")
    make_preference(db_session, user, "15_DAYS")
    recent_note = make_trashed_note(db_session, user, days_ago=5)

    fake_search_service = run_purge(monkeypatch, db_session)

    assert note_exists(db_session, recent_note)
    fake_search_service.delete_from_index.assert_not_called()


def test_purge_skips_users_with_never_policy(db_session, monkeypatch):
    user = make_user(db_session, "user3")
    make_preference(db_session, user, "NEVER")
    very_old_note = make_trashed_note(db_session, user, days_ago=1000)

    fake_search_service = run_purge(monkeypatch, db_session)

    assert note_exists(db_session, very_old_note)
    fake_search_service.delete_from_index.assert_not_called()


def test_purge_ignores_notes_that_are_not_in_trash(db_session, monkeypatch):
    user = make_user(db_session, "user4")
    make_preference(db_session, user, "15_DAYS")
    active_note = make_note(db_session, user)  # deleted_at=None

    fake_search_service = run_purge(monkeypatch, db_session)

    assert note_exists(db_session, active_note)
    fake_search_service.delete_from_index.assert_not_called()


def test_purge_applies_each_users_own_policy_independently(db_session, monkeypatch):
    lenient_user = make_user(db_session, "lenient")
    make_preference(db_session, lenient_user, "30_DAYS")
    kept_note = make_trashed_note(db_session, lenient_user, days_ago=20)

    strict_user = make_user(db_session, "strict")
    make_preference(db_session, strict_user, "15_DAYS")
    purged_note = make_trashed_note(db_session, strict_user, days_ago=20)

    fake_search_service = run_purge(monkeypatch, db_session)

    assert note_exists(db_session, kept_note)
    assert not note_exists(db_session, purged_note)
    fake_search_service.delete_from_index.assert_called_once_with(doc_ids=[purged_note.hash_id])


def test_purge_skips_notes_for_users_without_a_preference_row(db_session, monkeypatch):
    """Preference 가 아직 생성되지 않은 사용자는 정책을 판단할 수 없어 purge 대상에서 제외된다."""
    user = make_user(db_session, "no_pref")
    very_old_note = make_trashed_note(db_session, user, days_ago=1000)

    fake_search_service = run_purge(monkeypatch, db_session)

    assert note_exists(db_session, very_old_note)
    fake_search_service.delete_from_index.assert_not_called()