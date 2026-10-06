"""노트를 쓰고 곧바로 나올 때: 공동 편집의 늦은 저장을 당겨서, 목록이 방금 쓴 본문을 읽게 한다."""
import pytest

from app.modules.collab.application import client as collab_client
from conftest import create_note, member_headers


@pytest.fixture()
def collab_calls(monkeypatch):
    calls = []
    monkeypatch.setattr(collab_client, "_post", lambda note_hash, action, body=None: calls.append((note_hash, action)))
    return calls


def test_flush_asks_collab_to_store_the_open_note_now(client, auth_headers, collab_calls):
    note = create_note(client, auth_headers, title="회의록")

    response = client.post(f"/notes/{note}/flush", headers=auth_headers)

    assert response.status_code == 204
    assert collab_calls == [(note, "flush")]


def test_flush_is_quiet_when_collab_is_not_running(client, auth_headers):
    """collab 이 없으면(conftest 의 기본) 저장본이 곧 최신이다. 나가는 길을 막지 않는다."""
    note = create_note(client, auth_headers, title="회의록")

    assert client.post(f"/notes/{note}/flush", headers=auth_headers).status_code == 204


def test_flush_needs_access_to_the_note(client, auth_headers, collab_calls):
    note = create_note(client, auth_headers, title="회의록")
    stranger = member_headers(client)

    assert client.post(f"/notes/{note}/flush", headers=stranger).status_code == 404
    assert client.post(f"/notes/{note}/flush").status_code == 401
    assert collab_calls == []
