"""공동 편집 서버(collab)가 부르는 내부 API. 브라우저는 부르지 않는다.

collab 은 문서를 메모리에 들고 편집을 나눠 줄 뿐이고, 권한 판단과 영구 저장은 여기서 한다.
두 서버는 공유 비밀(X-Collab-Secret == COLLAB_SECRET)로 서로를 확인한다.
"""
import base64
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException
from jwt import InvalidTokenError
from pydantic import BaseModel

from app.core.config import settings
from app.core.jwt_util import jwt_manager
from app.modules.note.application.service import NoteService
from app.modules.note.interfaces.dependencies import get_note_service
from app.modules.user.infrastructure.repository import UserRepository


def verify_collab_secret(x_collab_secret: str | None = Header(default=None)) -> None:
    if not settings.COLLAB_SECRET or not hmac.compare_digest(
            (x_collab_secret or "").encode(), settings.COLLAB_SECRET.encode()):
        raise HTTPException(status_code=403, detail="collab 서버만 부를 수 있습니다.")


router = APIRouter(prefix="/internal/collab", tags=["Collab (internal)"], include_in_schema=False,
                   dependencies=[Depends(verify_collab_secret)])


class AuthorizeRequest(BaseModel):
    note: str
    # 브라우저가 연결할 때 보낸 로그인 토큰. 공개 링크로 보는 비회원은 없다.
    token: str | None = None
    # 비밀번호가 걸린 남의 노트를 비밀번호를 맞혀 열었을 때 함께 보낸다.
    password: str | None = None


class AuthorizeResponse(BaseModel):
    access: str  # edit | read
    user_id: str | None
    user_name: str


@router.post("/authorize", response_model=AuthorizeResponse)
def authorize(request: AuthorizeRequest, service: NoteService = Depends(get_note_service)):
    """이 연결로 노트를 편집할 수 있는지, 볼 수만 있는지. 권한 규칙은 노트 조회(GET /notes/{id})와 같다.

    - 로그인한 사람: 소유자·관리자·공유 워크스페이스 멤버면 편집, 비밀번호가 걸린 남의 노트는 맞혀야 들어온다.
    - 비회원: 붙이지 않는다(403). 공개 링크로 보는 비회원은 실시간 없이 저장본을 본다. 누구나 열 수 있는 링크라
      연결이 한없이 늘 수 있어서다.
    - 보호 노트(편집 제한)·휴지통 노트는 읽기 전용.
    볼 수 없으면 조회와 같은 403/404/410 을 돌려준다.
    """
    user = None
    if request.token:
        try:
            payload = jwt_manager.decode_payload(request.token)
            user = UserRepository(service.repository.db).get_user_by_user_hash(payload.get("user_hash"))
        except InvalidTokenError:
            user = None
    if user is None:
        raise HTTPException(status_code=403, detail="로그인한 사람만 공동 편집에 붙습니다.")

    note = service.get_note_by_hash_id(user_id=user.pk, note_hash=request.note, password=request.password)
    can_edit = note.is_editable and not note.is_protected and not note.is_deleted
    return AuthorizeResponse(access="edit" if can_edit else "read", user_id=user.hash_id, user_name=user.name)


class CollabState(BaseModel):
    # base64 로 적은 Yjs 상태. 처음 여는 노트는 None 이라 collab 이 html 로 만든다.
    ydoc: str | None
    html: str
    title: str


@router.get("/notes/{note_hash}/state", response_model=CollabState)
def load_state(note_hash: str, service: NoteService = Depends(get_note_service)):
    state = service.load_collab_state(note_hash)
    ydoc = base64.b64encode(state["ydoc"]).decode("ascii") if state["ydoc"] else None
    return CollabState(ydoc=ydoc, html=state["html"], title=state["title"])


class StoreRequest(BaseModel):
    ydoc: str
    html: str
    title: str = ""
    # False: 편집이 아니다(문서를 처음 만들거나 epoch 만 붙였다). Y 문서만 저장하고 본문·고친 시각은 그대로 둔다.
    edited: bool = True


@router.put("/notes/{note_hash}/state", status_code=204)
def store_state(note_hash: str, request: StoreRequest, service: NoteService = Depends(get_note_service)):
    ydoc = base64.b64decode(request.ydoc)
    if request.edited:
        service.store_collab_state(note_hash, ydoc, request.html, request.title)
    else:
        service.store_collab_ydoc(note_hash, ydoc)
