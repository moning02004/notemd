from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader

from app.core.commons.middlewares import AuthTokenMiddleware
from app.core.config import settings
from app.modules.note.interfaces.controller import router as note_router

auth_header = APIKeyHeader(name="Authorization", auto_error=False)
app = FastAPI(
    dependencies=[Depends(auth_header)]
)
app.include_router(note_router)

app.add_middleware(AuthTokenMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
