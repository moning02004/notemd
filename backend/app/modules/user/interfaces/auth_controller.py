import os
from urllib.parse import urlparse

from fastapi import APIRouter, Cookie, Depends, HTTPException
from starlette.responses import Response

from app.core.jwt_util import get_refresh_token_expires_seconds, verify_refresh_token
from app.modules.user.application.service import UserService
from app.modules.user.interfaces.dependencies import get_user_service
from app.modules.user.interfaces.schemas import ExistsResponse, MessageResponse, TokenObtainSchema, TokenResponse

router = APIRouter(prefix="", tags=["Auth"])


def _refresh_token_cookie_domain() -> str | None:
    hostname = urlparse(os.environ.get("FRONTEND_URL", "")).hostname
    if not hostname:
        return None

    # localhost/IP 로 접속하는 로컬 개발 환경에서는 Domain 속성을 아예 생략해야
    # 요청 호스트 기준으로 쿠키가 저장된다 (예: ".localhost" 는 유효하지 않은 도메인이라
    # 브라우저가 쿠키 자체를 버림).
    labels = hostname.split(".")
    if len(labels) < 2:
        return None
    return "." + ".".join(labels[-2:])


def _set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refreshtoken",
        value=refresh_token,
        expires=get_refresh_token_expires_seconds(),
        httponly=True,
        secure=True,
        samesite="none",  # 중요
        domain=_refresh_token_cookie_domain(),
        path="/",
        max_age=60 * 60 * 24 * 14,  # 14일
    )


@router.get("/check", response_model=ExistsResponse)
def check_service(service: UserService = Depends(get_user_service)):
    return ExistsResponse(exists=service.exists_user())


@router.post("/auth/obtain-token", response_model=TokenResponse)
def obtain_token(request: TokenObtainSchema,
                 response: Response,
                 service: UserService = Depends(get_user_service)):
    token_info, user_hash = service.obtain_token(request)
    _set_refresh_token_cookie(response, token_info["refresh_token"])
    return TokenResponse(access_token=token_info["access_token"], user_hash=user_hash)


@router.post("/auth/refresh-token", response_model=TokenResponse)
def refresh_token(response: Response, refreshtoken: str | None = Cookie(default=None),
                  service: UserService = Depends(get_user_service)):
    if not refreshtoken or not verify_refresh_token(refreshtoken):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_info, user_hash = service.refresh_token(refreshtoken)
    _set_refresh_token_cookie(response, token_info["refresh_token"])
    return TokenResponse(access_token=token_info["access_token"], user_hash=user_hash)


@router.delete("/auth/token", response_model=MessageResponse)
def delete_refresh_token(response: Response, refreshtoken: str = Cookie(default=None)):
    response.delete_cookie(
        key="refreshtoken",
    )
    return MessageResponse(message="success")
