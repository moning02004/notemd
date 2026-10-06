"""백엔드 → collab. 본문을 collab 밖에서 바꿀 때(에이전트 덧붙이기) 쓴다.

누가 노트를 열어 두고 있으면 collab 이 그 문서를 메모리에 들고 있다. 이때 DB 만 고치면 collab 의 다음 저장이
덮어쓴다. 그래서 collab 에 맡겨 열려 있는 문서에 섞고, collab 이 저장까지 마친 뒤에 돌아온다.

collab 을 쓰지 않거나(COLLAB_SECRET 없음) 닿지 않으면 CollabUnavailable. 부르는 쪽은 예전처럼 DB 에 쓴다.
collab 이 꺼져 있으면 메모리에 든 문서도 없으므로(다시 켜지면 DB 에서 불러온다) DB 에 써도 덮이지 않는다.
"""
import logging

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


class CollabUnavailable(Exception):
    pass


def _post(note_hash: str, action: str, body: dict | None = None) -> None:
    if not settings.COLLAB_SECRET:
        raise CollabUnavailable()
    try:
        response = httpx.post(f"{settings.COLLAB_INTERNAL_URL}/internal/notes/{note_hash}/{action}",
                              json=body or {},
                              headers={"X-Collab-Secret": settings.COLLAB_SECRET},
                              timeout=15)
    except httpx.HTTPError as error:
        # 주소를 잘못 적은 것이라면 열려 있는 문서가 덮일 수 있다. 로그로 알 수 있게 남긴다.
        logger.warning("collab 에 닿지 않아 DB 에 바로 씁니다(%s): %s", settings.COLLAB_INTERNAL_URL, error)
        raise CollabUnavailable() from error
    if response.status_code != 200:
        logger.error("collab %s 실패(%s): %s", action, response.status_code, response.text[:300])
        raise HTTPException(status_code=503, detail="공동 편집 서버가 노트를 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.")


def flush(note_hash: str) -> None:
    """열려 있는 문서의 지금 내용을 곧바로 저장하게 한다(저장은 편집 뒤 몇 초씩 늦으므로)."""
    _post(note_hash, "flush")


def replace(note_hash: str, html: str, title: str | None = None) -> None:
    """본문을 통째로 바꾸고(제목은 줄 때만), collab 이 저장까지 마치면 돌아온다."""
    _post(note_hash, "replace", {"html": html} if title is None else {"html": html, "title": title})


def append(note_hash: str, html: str) -> None:
    """문서 끝에 HTML 을 붙이고, collab 이 저장까지 마치면 돌아온다."""
    _post(note_hash, "append", {"html": html})
