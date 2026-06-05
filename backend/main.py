import importlib
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from starlette.staticfiles import StaticFiles

from app.core.config import settings
from app.core.middlewares.token import AuthTokenMiddleware
from app.modules.note.interfaces.controller import router as note_router
from app.modules.search.infrastructure.repository import SearchRepository
from app.modules.tag.interfaces.controller import router as tag_router
from app.modules.template.interfaces.controller import router as template_router
from app.modules.user.interfaces.controller import router as auth_router

modules = os.listdir("app/modules")
for module in modules:
    try:
        importlib.import_module(f"app.modules.{module}.infrastructure.models")
    except ModuleNotFoundError:
        continue


@asynccontextmanager
async def lifespan(app: FastAPI):
    SearchRepository().ensure_index()
    yield


auth_header = APIKeyHeader(name="Authorization", auto_error=False)

app = FastAPI(
    dependencies=[Depends(auth_header)],
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.STORAGE["type"] == "local":
    os.makedirs(settings.STORAGE["name"], exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.STORAGE["name"]), name="uploads")

app.add_middleware(AuthTokenMiddleware)
app.include_router(auth_router)
app.include_router(note_router)
app.include_router(template_router)
app.include_router(tag_router)
