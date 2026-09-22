"""노트 생성·조회·수정의 기본 동작과 접근 권한.

API 레벨로 검증한다. 검색 엔진은 conftest 의 인메모리 대역이 대신한다.
"""

from conftest import create_note, ensure_preference, member_headers


def test_create_note_starts_empty(client, auth_headers):
    """새 노트는 제목이 비어 있고 본문은 빈 문단 하나다."""
    note_hash = create_note(client, auth_headers)

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["title"] == ""
    assert response.json()["content"] == "<p></p>"


def test_patch_updates_only_the_given_fields(client, auth_headers):
    """프론트가 바뀐 필드만 보내므로, 빠진 필드는 기존 값이 그대로 남아야 한다."""
    note_hash = create_note(client, auth_headers, title="원래 제목", content="<p>원래 본문</p>")

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"title": "바뀐 제목"})

    assert response.status_code == 200
    assert response.json()["title"] == "바뀐 제목"
    assert response.json()["content"] == "<p>원래 본문</p>"


def test_patch_updates_tags(client, auth_headers):
    note_hash = create_note(client, auth_headers, tags=["회의", "2026"])

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert sorted(response.json()["tags"]) == ["2026", "회의"]


def test_patch_can_clear_tags(client, auth_headers):
    note_hash = create_note(client, auth_headers, tags=["회의"])

    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"tags": []})

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)
    assert response.json()["tags"] == []


def test_owner_gets_editable_note(client, auth_headers):
    note_hash = create_note(client, auth_headers)

    response = client.get(f"/notes/{note_hash}", headers=auth_headers)

    assert response.json()["is_editable"] is True


def test_get_unknown_note_returns_404(client, auth_headers):
    response = client.get("/notes/does-not-exist", headers=auth_headers)

    assert response.status_code == 404


def test_list_notes_requires_auth(client):
    response = client.get("/notes")

    assert response.status_code == 401


def test_create_note_requires_auth(client):
    response = client.post("/notes")

    assert response.status_code == 401


def test_private_note_is_hidden_from_anonymous_visitor(client, auth_headers):
    note_hash = create_note(client, auth_headers)

    response = client.get(f"/notes/{note_hash}")

    assert response.status_code == 404


def test_public_note_is_readable_without_login(client, auth_headers):
    """공개 링크로 열람은 되지만 편집은 불가능하다."""
    note_hash = create_note(client, auth_headers, title="공개 노트", is_public=True)

    response = client.get(f"/notes/{note_hash}")

    assert response.status_code == 200
    assert response.json()["title"] == "공개 노트"
    assert response.json()["is_editable"] is False


def test_public_note_is_readable_by_another_logged_in_member(client, auth_headers):
    """공개 노트는 로그아웃해야 보이는 노트가 아니다."""
    note_hash = create_note(client, auth_headers, title="공개 노트", is_public=True)
    other = member_headers(client)

    response = client.get(f"/notes/{note_hash}", headers=other)

    assert response.status_code == 200
    assert response.json()["is_editable"] is False


def test_other_member_cannot_read_my_note(client, auth_headers):
    note_hash = create_note(client, auth_headers)
    other = member_headers(client)

    response = client.get(f"/notes/{note_hash}", headers=other)

    assert response.status_code == 404


def test_other_member_cannot_update_my_note(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="원래 제목")
    other = member_headers(client)

    response = client.patch(f"/notes/{note_hash}", headers=other, json={"title": "덮어쓰기"})

    assert response.status_code == 404
    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["title"] == "원래 제목"


def test_public_note_is_still_not_editable_by_another_member(client, auth_headers):
    """공개는 열람 허용일 뿐 편집 허용이 아니다."""
    note_hash = create_note(client, auth_headers, title="원래 제목", is_public=True)
    other = member_headers(client)

    response = client.patch(f"/notes/{note_hash}", headers=other, json={"title": "덮어쓰기"})

    assert response.status_code in (403, 404)
    assert client.get(f"/notes/{note_hash}", headers=auth_headers).json()["title"] == "원래 제목"


def test_list_excludes_other_users_notes(client, auth_headers):
    create_note(client, auth_headers, title="내 노트")

    other = member_headers(client)
    create_note(client, other, title="남의 노트")

    response = client.get("/notes", headers=auth_headers)

    assert response.status_code == 200
    assert [note["title"] for note in response.json()] == ["내 노트"]


def test_first_edit_without_preference_row_does_not_crash(client, auth_headers):
    """설정을 한 번도 조회하지 않은 사용자도 노트를 저장할 수 있어야 한다."""
    note_hash = client.post("/notes", headers=auth_headers).json()["hash_id"]

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"title": "첫 편집"})

    assert response.status_code == 200


def test_preference_row_is_created_before_first_edit_in_normal_flow(client, auth_headers):
    """위 xfail 의 짝. 실제 클라이언트 순서(설정 조회 -> 편집)에서는 정상 동작한다."""
    ensure_preference(client, auth_headers)
    note_hash = client.post("/notes", headers=auth_headers).json()["hash_id"]

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"title": "첫 편집"})

    assert response.status_code == 200
