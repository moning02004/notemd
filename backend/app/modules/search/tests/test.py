"""검색 색인 어댑터.

실제 Meilisearch 대신 conftest 의 인메모리 대역이 붙는다. 여기서 확인할 것은
'엔진에 무엇을 넘기고 무엇을 돌려받아 쓰는가' — 특히 사용자 격리 필터다.
"""

from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository, INDEX_SETTINGS


def document(doc_id, user_hash, title="제목", content="본문"):
    return {"id": doc_id, "user_hash": user_hash, "title": title, "content": content}


def test_search_is_scoped_to_one_user(search_index):
    """색인은 전체 사용자가 함께 쓰므로 user_hash 필터가 유일한 격리 수단이다."""
    search_index.add_documents([
        document("mine", "user-a", title="회의록"),
        document("theirs", "user-b", title="회의록"),
    ])

    assert SearchRepository().search_index("회의록", user_hash="user-a") == ["mine"]


def test_search_returns_only_document_ids(search_index):
    search_index.add_documents([document("note-1", "user-a", content="배포 절차")])

    assert SearchRepository().search_index("배포", user_hash="user-a") == ["note-1"]


def test_search_without_a_match_returns_empty(search_index):
    search_index.add_documents([document("note-1", "user-a", title="회의록")])

    assert SearchRepository().search_index("존재하지않는말", user_hash="user-a") == []


def test_service_upserts_and_deletes_through_the_index(search_index):
    service = SearchService(SearchRepository())

    service.add_to_index([document("note-1", "user-a")])
    assert "note-1" in search_index.documents

    service.delete_from_index(["note-1"])
    assert "note-1" not in search_index.documents


def test_deleting_an_unknown_document_is_harmless(search_index):
    SearchService(SearchRepository()).delete_from_index(["never-indexed"])

    assert search_index.documents == {}


def test_index_settings_keep_typo_tolerance_off():
    """오타 보정을 켜면 '노트'로 '노드'가 잡힌다. 의도적으로 끈 설정이라 회귀를 막아둔다."""
    assert INDEX_SETTINGS["typoTolerance"]["enabled"] is False


def test_index_settings_allow_filtering_by_user():
    assert "user_hash" in INDEX_SETTINGS["filterableAttributes"]


def test_index_settings_search_title_and_body():
    assert INDEX_SETTINGS["searchableAttributes"] == ["title", "content"]
