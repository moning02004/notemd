from fastapi import APIRouter, Cookie, HTTPException, Depends
from sqlalchemy.orm import Session
from starlette.responses import Response

from app.core.session import get_db
from app.modules.user.application.service import verify_refresh_token, UserService
from app.modules.user.infrastructure.repository import UserRepository
from app.modules.user.interfaces.schemas import TokenObtainSchema, SignupSchema

router = APIRouter(prefix="", tags=["Auth"])


@router.post("/auth/obtain-token")
def obtain_token(request: TokenObtainSchema,
                 response: Response,
                 db: Session = Depends(get_db)):
    repository = UserRepository(db)
    service = UserService(repository)
    token_info, user_id = service.obtain_token(request)

    response.set_cookie(
        key="refreshtoken",
        value=token_info["refresh_token"],
        expires=service.get_token_expires(),
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return {"access_token": token_info["access_token"],
            "user_id": user_id}


@router.post("/auth/refresh-token")
def refresh_token(response: Response, refreshtoken: str = Cookie(...)):
    if not refreshtoken or not verify_refresh_token(refreshtoken):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    service = UserService(None)
    token_info, user_id = service.refresh_token(refreshtoken)
    response.set_cookie(
        key="refreshtoken",
        value=token_info["refresh_token"],
        expires=service.get_token_expires(),
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return {"access_token": token_info["access_token"],
            "user_id": user_id}


@router.post("/users")
def create_user(request: SignupSchema, db: Session = Depends(get_db)):
    repository = UserRepository(db)
    service = UserService(repository)
    user = service.create_user(request)
    return {"user_id": user.pk}
