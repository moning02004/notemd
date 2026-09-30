import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from starlette.requests import Request

from app.core.session import get_db
from app.modules.api_token.application.service import (TOKEN_PREFIX, AgentNoteService, ApiTokenService,
                                                       hash_token)
from app.modules.api_token.infrastructure.models import ApiToken
from app.modules.api_token.infrastructure.repository import ApiTokenRepository
from app.modules.note.interfaces.dependencies import get_note_service


def get_api_token_service(db=Depends(get_db)) -> ApiTokenService:
    return ApiTokenService(ApiTokenRepository(db))


def get_agent_note_service(note_service=Depends(get_note_service)) -> AgentNoteService:
    return AgentNoteService(note_service)


# 토큰마다 1분에 이만큼. 에이전트가 고리를 잘못 돌아 노트를 쏟아내는 것을 막는다.
# 프로세스(워커)마다 따로 센다. 셀프호스팅 규모에서는 이 정도면 충분하다.
RATE_LIMIT_PER_MINUTE = 60
# pk 는 DB 를 새로 만들면 다시 1부터라 겹칠 수 있어, 토큰마다 고유한 hash_id 로 센다.
_calls: dict[str, deque] = defaultdict(deque)
_calls_lock = threading.Lock()


def _check_rate_limit(token_id: str) -> None:
    now = time.monotonic()
    with _calls_lock:
        calls = _calls[token_id]
        while calls and now - calls[0] > 60:
            calls.popleft()
        if len(calls) >= RATE_LIMIT_PER_MINUTE:
            raise HTTPException(status_code=429, detail="요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
                                headers={"Retry-After": str(int(60 - (now - calls[0])) + 1)})
        calls.append(now)


@dataclass
class ApiCaller:
    user: object
    token: ApiToken


def authenticate(authorization: str | None, db, scope: str) -> ApiCaller:
    """'Authorization: Bearer mdn_…' 개인 API 토큰을 확인한다. /api/v1 과 MCP 서버가 함께 쓴다.

    로그인 토큰은 받지 않는다. scope 가 read 이면 read_write 토큰만 통과한다(쓰기는 모든 토큰).
    """
    raw = (authorization or "").removeprefix("Bearer ").strip()
    if not raw.startswith(TOKEN_PREFIX):
        raise HTTPException(status_code=401, detail="API 토큰이 필요합니다. 'Authorization: Bearer mdn_…'")

    repository = ApiTokenRepository(db)
    token = repository.find_by_token_hash(hash_token(raw))
    if token is None:
        raise HTTPException(status_code=401, detail="API 토큰이 올바르지 않거나 폐기되었습니다.")
    if scope == "read" and token.scope != "read_write":
        raise HTTPException(status_code=403, detail="이 토큰에는 읽기 권한이 없습니다.")

    _check_rate_limit(token.hash_id)
    repository.touch(token)
    return ApiCaller(user=token.user, token=token)


def api_token_caller(scope: str):
    """/api/v1 의 인증 의존성."""

    def dependency(request: Request, db=Depends(get_db)) -> ApiCaller:
        return authenticate(request.headers.get("Authorization"), db, scope)

    return dependency
