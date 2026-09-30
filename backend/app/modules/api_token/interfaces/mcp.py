"""note.md 를 AI 에이전트의 도구로 쓰게 하는 MCP 서버(Streamable HTTP, /mcp).

에이전트 설정에 주소와 개인 API 토큰만 넣으면 된다. 예(Claude Code):

    claude mcp add --transport http notemd https://<서버>/mcp --header "Authorization: Bearer mdn_…"

도구는 /api/v1 과 같은 일을 한다(AgentNoteService). 토큰 확인·권한·요청 제한도 같다.
- 상태 없는(stateless) 모드: gunicorn 워커가 여럿이라 세션을 메모리에 두면 요청이 다른 워커로 가면 끊긴다.
- DNS rebinding 보호는 끈다: 쿠키가 아니라 Bearer 토큰으로 확인하므로 해당하지 않고, 켜 두면
  localhost 가 아닌 서버 주소를 거절한다.
"""
from contextlib import contextmanager
from typing import Iterator

from fastapi import HTTPException
from pydantic import BaseModel, Field
from mcp.server.mcpserver import Context, MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.server.transport_security import TransportSecuritySettings

from app.core.session import SessionLocal
from app.modules.api_token.application.service import AgentNoteService
from app.modules.api_token.interfaces.dependencies import ApiCaller, authenticate
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository

INSTRUCTIONS = """\
note.md 는 사용자의 개인 마크다운 노트 앱이다. 이 도구들로 사용자의 노트를 만들고, 덧붙이고, 찾고, 읽는다.

- 본문은 마크다운으로 쓴다. 체크리스트(- [ ] / - [x]), 접기(<details><summary>제목</summary> … </details>),
  표, 코드 블록이 앱에서 그대로 보인다. 제목은 title 에 따로 주고 본문에 다시 쓰지 않는다.
- folder 는 '업무/회의' 같은 경로다. 없는 폴더는 만든다(3단계까지). 먼저 list_folders 로 있는 폴더를 보고 고르면 좋다.
- 회의록·일지처럼 한 노트에 계속 쌓는 것은 새로 만들지 말고 append_to_note 로 덧붙인다.
  어떤 노트인지 모르면 search_notes 로 찾는다.
- 사용자에게 결과를 알릴 때는 돌려받은 url 을 함께 준다.
- 쓴 노트는 스냅샷 설명에 토큰 이름이 남고, 덧붙이기 전 모습은 스냅샷으로 되돌릴 수 있다.
"""

mcp_server = MCPServer(name="note.md", title="note.md", instructions=INSTRUCTIONS)


@contextmanager
def _agent(ctx: Context, scope: str) -> Iterator[tuple[ApiCaller, AgentNoteService]]:
    """요청마다 DB 세션을 열고 토큰을 확인한다. 서비스의 HTTP 오류는 에이전트가 읽을 도구 오류로 바꾼다."""
    db = SessionLocal()
    try:
        headers = ctx.headers or {}
        caller = authenticate(headers.get("authorization") or headers.get("Authorization"), db, scope)
        service = AgentNoteService(NoteService(NoteRepository(db), search_service=SearchService(SearchRepository())))
        yield caller, service
    except HTTPException as error:
        raise ToolError(str(error.detail)) from error
    finally:
        db.close()


# 도구가 돌려주는 모양. 형식을 밝혀 두면 에이전트가 결과를 글이 아니라 구조로 받는다(output schema).
class NoteSummary(BaseModel):
    id: str = Field(description="노트 id. append_to_note·read_note 에 쓴다.")
    title: str
    folder: str | None = Field(description="'업무/회의' 같은 폴더 경로. 미분류면 null.")
    url: str = Field(description="앱에서 이 노트를 여는 주소. 사용자에게 알려줄 때 쓴다.")
    updated_at: str | None


class NoteSearchResult(NoteSummary):
    snippet: str = Field(description="본문 앞부분")


class NoteDetail(NoteSummary):
    content: str = Field(description="마크다운 본문")


def _note_summary(service: AgentNoteService, note) -> dict:
    return {
        "id": note.hash_id,
        "title": note.title or "",
        "folder": service.folder_path_of(note.folder),
        "url": service.note_url(note.hash_id),
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }


@mcp_server.tool()
def create_note(ctx: Context, title: str, content: str = "", folder: str | None = None) -> NoteSummary:
    """새 노트를 만든다.

    Args:
        title: 노트 제목
        content: 마크다운 본문(체크리스트·접기·표 가능)
        folder: '업무/회의' 같은 폴더 경로. 없는 폴더는 만든다. 비우면 미분류.
    """
    with _agent(ctx, "write") as (caller, service):
        note = service.create_note(caller.user, caller.token, title, content, folder)
        return NoteSummary(**_note_summary(service, note))


@mcp_server.tool()
def append_to_note(ctx: Context, note_id: str, content: str) -> NoteSummary:
    """기존 노트 끝에 마크다운을 덧붙인다. 회의록·일지처럼 한 노트에 계속 쌓을 때 쓴다.

    Args:
        note_id: 노트 id(search_notes·create_note 가 돌려준 id)
        content: 덧붙일 마크다운
    """
    with _agent(ctx, "write") as (caller, service):
        note = service.append_to_note(caller.user, caller.token, note_id, content)
        return NoteSummary(**_note_summary(service, note))


@mcp_server.tool()
def search_notes(ctx: Context, query: str = "", page: int = 1) -> list[NoteSearchResult]:
    """노트를 찾는다. query 를 비우면 최근에 고친 노트부터 돌려준다(한 쪽에 20개). 읽기·쓰기 토큰이 필요하다.

    Args:
        query: 찾을 말
        page: 쪽 번호(1부터)
    """
    with _agent(ctx, "read") as (caller, service):
        notes = service.list_notes(caller.user, query, max(page, 1))
        return [NoteSearchResult(**_note_summary(service, note), snippet=service.snippet(note.content)) for note in notes]


@mcp_server.tool()
def read_note(ctx: Context, note_id: str) -> NoteDetail:
    """노트 하나를 마크다운으로 읽는다. 읽기·쓰기 토큰이 필요하다.

    Args:
        note_id: 노트 id
    """
    with _agent(ctx, "read") as (caller, service):
        note, markdown = service.get_note_markdown(caller.user, note_id)
        return NoteDetail(**_note_summary(service, note), content=markdown)


@mcp_server.tool()
def list_folders(ctx: Context) -> list[str]:
    """폴더 경로 목록('업무/회의'). create_note 의 folder 에 그대로 넣으면 된다. 읽기·쓰기 토큰이 필요하다."""
    with _agent(ctx, "read") as (caller, service):
        return service.folder_paths(caller.user)


# FastAPI 에 붙이는 앱(경로 /mcp 하나). session_manager 는 앱을 만든 뒤에 쓸 수 있어 여기서 만든다.
# 하위 앱으로 mount 하면 /mcp 가 /mcp/ 로 307 되돌려 보내는데, 그 주소가 http:// 로 적혀 HTTPS 프록시 뒤에서
# 어긋날 수 있다. 라우트를 FastAPI 에 그대로 옮겨 /mcp 에서 바로 받는다(main.py).
mcp_app = mcp_server.streamable_http_app(
    streamable_http_path="/mcp",
    stateless_http=True,
    json_response=True,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)
