"""태그 목록과 노트 수 집계.

Tag 행 자체는 사용자 구분이 없고 노트-태그 연결로만 사용자가 갈린다.
그래서 '남의 태그가 내 목록에 새지 않는가'가 이 모듈의 핵심 테스트다.
"""

from conftest import create_note, member_headers


def tag_counts(client, headers, **params):
    response = client.get("/tags", headers=headers, params=params)
    assert response.status_code == 200, response.text
    return {tag["keyword"]: tag["count"] for tag in response.json()}


def test_tags_include_a_total_entry(client, auth_headers):
    create_note(client, auth_headers, title="회의록", tags=["회의"])
    create_note(client, auth_headers, title="잡담", tags=["메모"])

    assert tag_counts(client, auth_headers) == {"전체": 2, "회의": 1, "메모": 1}


def test_total_entry_can_be_turned_off(client, auth_headers):
    create_note(client, auth_headers, title="회의록", tags=["회의"])

    assert tag_counts(client, auth_headers, total=0) == {"회의": 1}


def test_a_tag_used_by_two_notes_is_counted_twice(client, auth_headers):
    create_note(client, auth_headers, title="첫번째", tags=["회의"])
    create_note(client, auth_headers, title="두번째", tags=["회의"])

    assert tag_counts(client, auth_headers)["회의"] == 2


def test_trashed_notes_are_not_counted(client, auth_headers):
    create_note(client, auth_headers, title="살아있는", tags=["회의"])
    trashed = create_note(client, auth_headers, title="버려진", tags=["회의"])

    client.delete(f"/notes/{trashed}", headers=auth_headers)

    assert tag_counts(client, auth_headers) == {"전체": 1, "회의": 1}


def test_a_tag_with_no_remaining_notes_disappears(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="유일한 노트", tags=["회의"])

    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    assert tag_counts(client, auth_headers) == {"전체": 0}


def test_another_users_tags_do_not_leak(client, auth_headers):
    """Tag 행은 사용자 간에 공유되므로 같은 키워드를 써도 수가 섞이면 안 된다."""
    create_note(client, auth_headers, title="내 회의록", tags=["회의"])

    other = member_headers(client)
    create_note(client, other, title="남의 회의록", tags=["회의", "남의태그"])

    assert tag_counts(client, auth_headers) == {"전체": 1, "회의": 1}
    assert tag_counts(client, other) == {"전체": 1, "회의": 1, "남의태그": 1}


def test_tags_require_auth(client):
    assert client.get("/tags").status_code == 401
