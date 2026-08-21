"""검색어로 노트를 조회할 때 다른 사용자의 노트가 섞이지 않는지 확인한다.

Meilisearch 색인 반영이 비동기라 검색 엔진을 흉내 내는 스텁을 쓰고,
저장소 조회 인자가 올바른 순서로 전달되는지에 집중한다.
"""

from app.modules.note.application.service import NoteService
from app.modules.note.domain.entity import NoteEntity
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.user.infrastructure.repository import UserRepository


class StubSearchService:
    """검색 엔진이 찾아낸 것처럼 넘겨받은 hash 를 그대로 돌려준다."""

    def __init__(self, note_hashes):
        self.note_hashes = note_hashes

    def find_documents(self, keyword, user_hash, sort, page):
        return self.note_hashes

    def add_to_index(self, data):
        return None


def create_user_with_note(db_session, username: str, title: str):
    user = UserRepository(db_session).create_user(
        username=username,
        hashed_password="x",
        name=username,
        is_superuser=False,
    )
    note = NoteRepository(db_session).create_note(
        NoteEntity(user_id=user.pk, title=title, content="<p>내용</p>")
    )
    return user, note


def test_keyword_search_excludes_other_users_notes(db_session):
    owner, owned_note = create_user_with_note(db_session, "owner", "내 노트")
    _, other_note = create_user_with_note(db_session, "other", "남의 노트")

    service = NoteService(
        NoteRepository(db_session),
        # 검색 엔진이 두 노트를 모두 돌려줘도, 조회 단계에서 소유자로 걸러져야 한다.
        search_service=StubSearchService([owned_note.hash_id, other_note.hash_id]),
    )

    notes = service.list_notes(
        user_hash=owner.hash_id,
        keyword="노트",
        is_deleted=False,
        page=1,
    )

    assert [note.hash_id for note in notes] == [owned_note.hash_id]
