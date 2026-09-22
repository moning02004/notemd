"""목록 조회: 태그 필터, 정렬, 페이지네이션.

정렬은 created_at/updated_at 값에 따라 갈리는데 SQLite 의 CURRENT_TIMESTAMP 는 초 단위라
API 로 연달아 만든 노트끼리는 순서가 갈리지 않는다. 그래서 정렬만 저장소 레벨에서
타임스탬프를 직접 박아 넣고 확인한다.
"""

from datetime import datetime, timedelta

from app.modules.note.domain.entity import NoteEntity
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.user.infrastructure.repository import UserRepository
from conftest import create_note, note_hashes


def make_user(db_session, username="owner"):
    return UserRepository(db_session).create_user(
        username=username, hashed_password="x", name=username, is_superuser=False,
    )


def make_note(db_session, user, title, created_at=None, updated_at=None, deleted_at=None):
    note = NoteRepository(db_session).create_note(NoteEntity(user_id=user.pk, title=title, content="<p></p>"))
    if created_at:
        note.created_at = created_at
    if updated_at:
        note.updated_at = updated_at
    if deleted_at:
        note.deleted_at = deleted_at
    db_session.commit()
    return note


def titles(notes):
    return [note.title for note in notes]


# --- API 레벨 -----------------------------------------------------------------

def test_tag_filter_returns_only_matching_notes(client, auth_headers):
    tagged = create_note(client, auth_headers, title="회의록", tags=["회의"])
    create_note(client, auth_headers, title="잡담", tags=["메모"])

    response = client.get("/notes", headers=auth_headers, params={"tag": "회의"})

    assert response.status_code == 200
    assert note_hashes(response) == [tagged]


def test_tag_filter_excludes_trashed_notes(client, auth_headers):
    kept = create_note(client, auth_headers, title="살아있는 회의록", tags=["회의"])
    trashed = create_note(client, auth_headers, title="버려진 회의록", tags=["회의"])
    client.delete(f"/notes/{trashed}", headers=auth_headers)

    response = client.get("/notes", headers=auth_headers, params={"tag": "회의"})

    assert note_hashes(response) == [kept]


def test_unknown_tag_returns_nothing(client, auth_headers):
    create_note(client, auth_headers, title="회의록", tags=["회의"])

    response = client.get("/notes", headers=auth_headers, params={"tag": "없는태그"})

    assert response.json() == []


def test_page_size_is_twenty(client, auth_headers):
    for _ in range(21):
        create_note(client, auth_headers)

    first_page = client.get("/notes", headers=auth_headers, params={"page": 1})
    second_page = client.get("/notes", headers=auth_headers, params={"page": 2})

    assert len(first_page.json()) == 20
    assert len(second_page.json()) == 1
    assert not set(note_hashes(first_page)) & set(note_hashes(second_page))


def test_page_below_one_is_rejected(client, auth_headers):
    response = client.get("/notes", headers=auth_headers, params={"page": 0})

    assert response.status_code == 422


# --- 저장소 레벨 (정렬) --------------------------------------------------------

def test_default_sort_is_newest_created_first(db_session):
    user = make_user(db_session)
    now = datetime(2026, 9, 22, 12, 0, 0)
    make_note(db_session, user, "오래된", created_at=now - timedelta(days=2))
    make_note(db_session, user, "최근", created_at=now)

    notes = NoteRepository(db_session).list_note_by_user_hash(user.hash_id)

    assert titles(notes) == ["최근", "오래된"]


def test_created_at_sort_is_oldest_first(db_session):
    user = make_user(db_session)
    now = datetime(2026, 9, 22, 12, 0, 0)
    make_note(db_session, user, "오래된", created_at=now - timedelta(days=2))
    make_note(db_session, user, "최근", created_at=now)

    notes = NoteRepository(db_session).list_note_by_user_hash(user.hash_id, sort="created_at")

    assert titles(notes) == ["오래된", "최근"]


def test_updated_at_sort_puts_the_recently_edited_note_first(db_session):
    user = make_user(db_session)
    now = datetime(2026, 9, 22, 12, 0, 0)
    make_note(db_session, user, "먼저 만든 뒤 방금 고친", created_at=now - timedelta(days=2), updated_at=now)
    make_note(db_session, user, "나중에 만들고 안 고친", created_at=now - timedelta(days=1),
              updated_at=now - timedelta(days=1))

    notes = NoteRepository(db_session).list_note_by_user_hash(user.hash_id, sort="-updated_at")

    assert titles(notes) == ["먼저 만든 뒤 방금 고친", "나중에 만들고 안 고친"]


def test_trash_is_ordered_by_deletion_time(db_session):
    user = make_user(db_session)
    now = datetime(2026, 9, 22, 12, 0, 0)
    make_note(db_session, user, "먼저 버린", deleted_at=now - timedelta(days=3))
    make_note(db_session, user, "나중에 버린", deleted_at=now)

    notes = NoteRepository(db_session).list_note_by_user_hash(user.hash_id, is_deleted=True)

    assert titles(notes) == ["나중에 버린", "먼저 버린"]


def test_listing_never_mixes_two_users_notes(db_session):
    owner = make_user(db_session, "owner")
    other = make_user(db_session, "other")
    make_note(db_session, owner, "내 노트")
    make_note(db_session, other, "남의 노트")

    notes = NoteRepository(db_session).list_note_by_user_hash(owner.hash_id)

    assert titles(notes) == ["내 노트"]
