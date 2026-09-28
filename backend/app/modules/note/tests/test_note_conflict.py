"""두 곳(다른 탭·기기·공유 멤버)에서 같은 노트를 고칠 때 먼저 저장된 내용을 덮어쓰지 않는다.

편집 화면은 받은 노트의 updated_at 을 base_updated_at 으로 돌려준다. 그 사이 서버의 노트가 바뀌었으면 409.
테스트 DB(SQLite)는 시각을 초 단위로 적으므로, 두 저장이 서로 다른 시각이 되도록 1초 넘게 기다린다.
"""

import time

from conftest import create_note, member_headers


def _load(client, headers, note_hash):
    return client.get(f"/notes/{note_hash}", headers=headers).json()


def test_note_tells_the_editor_its_version(client, auth_headers):
    note_hash = create_note(client, auth_headers)

    assert _load(client, auth_headers, note_hash)["updated_at"]


def test_save_from_the_latest_version_goes_through_and_returns_the_new_version(client, auth_headers):
    note_hash = create_note(client, auth_headers, content="<p>처음</p>")
    base = _load(client, auth_headers, note_hash)["updated_at"]
    time.sleep(1.1)

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers,
                            json={"content": "<p>고침</p>", "base_updated_at": base})

    assert response.status_code == 200
    assert response.json()["content"] == "<p>고침</p>"
    assert response.json()["updated_at"] != base


def test_save_from_a_stale_version_is_rejected_and_keeps_the_other_edit(client, auth_headers):
    note_hash = create_note(client, auth_headers, content="<p>처음</p>")
    stale = _load(client, auth_headers, note_hash)["updated_at"]
    time.sleep(1.1)
    # 다른 탭이 먼저 저장했다.
    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"content": "<p>다른 탭</p>"})

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers,
                            json={"content": "<p>오래된 탭</p>", "base_updated_at": stale})

    assert response.status_code == 409
    assert response.json()["detail"]["is_conflict"] is True
    assert _load(client, auth_headers, note_hash)["content"] == "<p>다른 탭</p>"


def test_save_without_a_version_overwrites(client, auth_headers):
    """'내 내용으로 저장' 과 설정 변경은 버전을 보내지 않는다."""
    note_hash = create_note(client, auth_headers, content="<p>처음</p>")
    time.sleep(1.1)
    client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"content": "<p>다른 탭</p>"})

    response = client.patch(f"/notes/{note_hash}", headers=auth_headers, json={"content": "<p>내 내용</p>"})

    assert response.status_code == 200
    assert _load(client, auth_headers, note_hash)["content"] == "<p>내 내용</p>"


def test_conflict_is_not_revealed_to_someone_who_cannot_edit(client, auth_headers):
    note_hash = create_note(client, auth_headers)
    other = member_headers(client)

    response = client.patch(f"/notes/{note_hash}", headers=other,
                            json={"title": "덮어쓰기", "base_updated_at": "2000-01-01T00:00:00+00:00"})

    assert response.status_code == 404
