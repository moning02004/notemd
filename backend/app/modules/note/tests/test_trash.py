"""휴지통: 소프트 삭제 -> 복구 -> 영구 삭제와 검색 색인 동기화."""

from conftest import create_note, member_headers, note_hashes


def titles(response):
    return [note["title"] for note in response.json()]


def list_notes(client, headers, **params):
    return client.get("/notes", headers=headers, params=params)


def test_deleted_note_moves_to_trash(client, auth_headers):
    """삭제한 노트는 기본 목록에서 빠지고 휴지통 목록에 나타난다."""
    note_hash = create_note(client, auth_headers, title="지울 노트")

    response = client.delete(f"/notes/{note_hash}", headers=auth_headers)

    assert response.status_code == 200
    assert titles(list_notes(client, auth_headers)) == []
    assert titles(list_notes(client, auth_headers, is_deleted=1)) == ["지울 노트"]


def test_trashed_note_keeps_deleted_at_in_the_list(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="지울 노트")
    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    trashed = list_notes(client, auth_headers, is_deleted=1).json()[0]

    assert trashed["deleted_at"] is not None


def test_restore_brings_the_note_back(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="되살릴 노트")
    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    response = client.patch(f"/notes/{note_hash}/restore", headers=auth_headers)

    assert response.status_code == 200
    assert titles(list_notes(client, auth_headers)) == ["되살릴 노트"]
    assert titles(list_notes(client, auth_headers, is_deleted=1)) == []


def test_permanent_delete_removes_the_note_everywhere(client, auth_headers, search_index):
    note_hash = create_note(client, auth_headers, title="영구 삭제")
    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    response = client.delete(f"/notes/{note_hash}/permanently", headers=auth_headers)

    assert response.status_code == 200
    assert titles(list_notes(client, auth_headers, is_deleted=1)) == []
    assert client.get(f"/notes/{note_hash}", headers=auth_headers).status_code == 404
    assert note_hash not in search_index.documents


def test_permanent_delete_works_without_going_through_trash(client, auth_headers):
    """휴지통을 거치지 않고 바로 영구 삭제해도 동작한다."""
    note_hash = create_note(client, auth_headers, title="바로 삭제")

    response = client.delete(f"/notes/{note_hash}/permanently", headers=auth_headers)

    assert response.status_code == 200
    assert client.get(f"/notes/{note_hash}", headers=auth_headers).status_code == 404


def test_bulk_delete_and_restore(client, auth_headers):
    hashes = [
        create_note(client, auth_headers, title="첫번째"),
        create_note(client, auth_headers, title="두번째"),
    ]

    response = client.request("DELETE", "/notes", headers=auth_headers, json={"note_hashes": hashes})
    assert response.status_code == 200
    assert sorted(response.json()) == sorted(hashes)
    assert len(list_notes(client, auth_headers).json()) == 0

    response = client.patch("/notes/restore", headers=auth_headers, json={"note_hashes": hashes})
    assert response.status_code == 200
    assert len(list_notes(client, auth_headers).json()) == 2


def test_bulk_permanent_delete(client, auth_headers, search_index):
    hashes = [
        create_note(client, auth_headers, title="첫번째"),
        create_note(client, auth_headers, title="두번째"),
    ]

    response = client.request("DELETE", "/notes/permanently", headers=auth_headers,
                              json={"note_hashes": hashes})

    assert response.status_code == 200
    assert len(list_notes(client, auth_headers).json()) == 0
    assert search_index.documents == {}


def test_other_member_cannot_delete_my_note(client, auth_headers):
    """소유자가 아니면 아무것도 지워지지 않고 빈 결과만 돌아온다."""
    note_hash = create_note(client, auth_headers, title="내 노트")
    other = member_headers(client)

    response = client.delete(f"/notes/{note_hash}", headers=other)

    assert response.json() == []
    assert titles(list_notes(client, auth_headers)) == ["내 노트"]


def test_other_member_cannot_permanently_delete_my_note(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="내 노트")
    other = member_headers(client)

    client.delete(f"/notes/{note_hash}/permanently", headers=other)

    assert titles(list_notes(client, auth_headers)) == ["내 노트"]


def test_other_member_cannot_restore_my_note(client, auth_headers):
    note_hash = create_note(client, auth_headers, title="내 노트")
    client.delete(f"/notes/{note_hash}", headers=auth_headers)
    other = member_headers(client)

    client.patch(f"/notes/{note_hash}/restore", headers=other)

    assert titles(list_notes(client, auth_headers)) == []
    assert titles(list_notes(client, auth_headers, is_deleted=1)) == ["내 노트"]


def test_trashed_note_is_marked_deleted_in_the_search_index(client, auth_headers, search_index):
    note_hash = create_note(client, auth_headers, title="색인 확인")

    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    assert search_index.documents[note_hash]["is_deleted"] is True


def test_restored_note_is_marked_active_in_the_search_index(client, auth_headers, search_index):
    note_hash = create_note(client, auth_headers, title="색인 확인")
    client.delete(f"/notes/{note_hash}", headers=auth_headers)

    client.patch(f"/notes/{note_hash}/restore", headers=auth_headers)

    assert search_index.documents[note_hash]["is_deleted"] is False


def test_keyword_search_excludes_trashed_notes(client, auth_headers):
    """검색으로 목록을 좁혀도 휴지통 노트는 나오지 않아야 한다."""
    kept = create_note(client, auth_headers, title="살아있는 회의록")
    trashed = create_note(client, auth_headers, title="버려진 회의록")
    client.delete(f"/notes/{trashed}", headers=auth_headers)

    response = list_notes(client, auth_headers, keyword="회의록")

    assert note_hashes(response) == [kept]


def test_keyword_search_finds_notes_by_body_text(client, auth_headers):
    """제목이 아니라 본문에 있는 말로도 찾을 수 있어야 한다 (전문 검색의 존재 이유)."""
    note_hash = create_note(client, auth_headers, title="제목", content="<p>배포 절차 정리</p>")
    create_note(client, auth_headers, title="다른 노트", content="<p>상관없는 내용</p>")

    response = list_notes(client, auth_headers, keyword="배포 절차")

    assert note_hashes(response) == [note_hash]


def test_owner_opens_a_trashed_note_read_only(client, auth_headers):
    """링크나 주소로 휴지통 노트에 들어와도 휴지통에 있다는 걸 알 수 있어야 하고, 고칠 수는 없다."""
    owner = member_headers(client)
    note_hash = create_note(client, owner, title="버린 노트")
    client.delete(f"/notes/{note_hash}", headers=owner)

    body = client.get(f"/notes/{note_hash}", headers=owner).json()

    assert body["is_deleted"] is True
    assert body["is_editable"] is False
    assert body["title"] == "버린 노트"


def test_others_are_told_a_trashed_note_was_deleted(client, auth_headers):
    owner = member_headers(client)
    note_hash = create_note(client, owner, title="버린 공개 노트", content="<p>남기면 안 되는 본문</p>",
                            is_public=True)
    client.delete(f"/notes/{note_hash}", headers=owner)

    for viewer in ({}, member_headers(client, username="stranger", name="남")):
        response = client.get(f"/notes/{note_hash}", headers=viewer)
        assert response.status_code == 410
        assert "남기면 안 되는 본문" not in response.text
        # 복원하거나 주인이 로그인한 뒤에도 캐시된 '삭제됨' 이 남으면 안 된다.
        assert response.headers["cache-control"] == "no-store"


def test_trashed_note_cannot_be_edited_until_restored(client, auth_headers):
    owner = member_headers(client)
    note_hash = create_note(client, owner, title="버린 노트")
    client.delete(f"/notes/{note_hash}", headers=owner)

    assert client.patch(f"/notes/{note_hash}", headers=owner, json={"title": "몰래 고침"}).status_code == 409

    client.patch(f"/notes/{note_hash}/restore", headers=owner)

    assert client.patch(f"/notes/{note_hash}", headers=owner, json={"title": "고침"}).status_code == 200
    body = client.get(f"/notes/{note_hash}", headers=owner).json()
    assert body["is_deleted"] is False
    assert body["is_editable"] is True
