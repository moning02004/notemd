"""MCP 서버(/mcp)의 도구. /api/v1 과 같은 일을 하고, 토큰 확인·권한도 같다.

HTTP 전송까지 거치려면 세션 관리자를 띄워야 하는데 프로세스마다 한 번만 띄울 수 있다.
여기서는 도구 함수를 요청 헤더만 흉내 낸 컨텍스트로 직접 부른다(전송은 SDK 가 맡는다).
"""
from types import SimpleNamespace

import pytest
from mcp.server.mcpserver.exceptions import ToolError

from conftest import create_note, member_headers
from app.modules.api_token.interfaces import mcp as mcp_module


@pytest.fixture(autouse=True)
def use_test_db(db_session, monkeypatch):
    monkeypatch.setattr(mcp_module, "SessionLocal", lambda: db_session)


def issue(client, headers, scope="read_write", name="Claude"):
    response = client.post("/api-tokens", headers=headers, json={"name": name, "scope": scope})
    assert response.status_code == 201, response.text
    return response.json()["token"]


def ctx(token=None):
    return SimpleNamespace(headers={"authorization": f"Bearer {token}"} if token else {})


def test_tools_are_registered():
    import asyncio

    names = {tool.name for tool in asyncio.run(mcp_module.mcp_server.list_tools())}

    assert names == {"create_note", "append_to_note", "replace_note", "search_notes", "read_note", "list_folders"}


def test_create_append_read_through_tools(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)

    created = mcp_module.create_note(ctx(token), title="회의록", content="- [ ] 안건", folder="업무/회의")
    assert created.folder == "업무/회의"
    assert created.url.endswith(f"/s/{created.id}")

    mcp_module.append_to_note(ctx(token), note_id=created.id, content="덧붙임")
    note = mcp_module.read_note(ctx(token), note_id=created.id)

    assert note.content == "- [ ] 안건\n\n덧붙임\n"
    assert mcp_module.list_folders(ctx(token)) == ["업무", "업무/회의"]


def test_replace_through_tools(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner, scope="read_write")
    created = mcp_module.create_note(ctx(token), title="초안", content="처음 쓴 글")

    replaced = mcp_module.replace_note(ctx(token), note_id=created.id, content="다시 쓴 글")

    assert replaced.id == created.id
    assert replaced.title == "초안"
    assert mcp_module.read_note(ctx(token), note_id=created.id).content == "다시 쓴 글\n"


def test_search_through_tools(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)
    create_note(client, owner, title="배포 절차", content="<p>마이그레이션 먼저</p>")

    results = mcp_module.search_notes(ctx(token), query="배포")

    assert [note.title for note in results] == ["배포 절차"]
    assert results[0].snippet == "마이그레이션 먼저"


def test_tools_need_a_valid_token(client, auth_headers):
    with pytest.raises(ToolError, match="API 토큰이 필요합니다"):
        mcp_module.list_folders(ctx())
    with pytest.raises(ToolError, match="올바르지 않거나 폐기"):
        mcp_module.list_folders(ctx("mdn_wrong"))


def test_write_token_cannot_read_through_tools(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner, scope="write")

    assert mcp_module.create_note(ctx(token), title="쓰기는 된다").title == "쓰기는 된다"
    with pytest.raises(ToolError, match="읽기 권한"):
        mcp_module.search_notes(ctx(token))


def test_other_peoples_notes_are_not_found(client, auth_headers):
    owner = member_headers(client)
    token = issue(client, owner)
    stranger = member_headers(client, username="stranger", name="남")
    theirs = create_note(client, stranger, title="남의 노트")

    with pytest.raises(ToolError, match="노트를 찾을 수 없습니다"):
        mcp_module.read_note(ctx(token), note_id=theirs)
