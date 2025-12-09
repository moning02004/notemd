import importlib
import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader

from app.core.config import settings
from app.core.middlewares.token import AuthTokenMiddleware
from app.modules.note.interfaces.note_controller import note_router
from app.modules.template.interfaces.controller import router as template_router
from app.modules.user.interfaces.controller import router as auth_router

modules = os.listdir("app/modules")
for module in modules:
    try:
        importlib.import_module(f"app.modules.{module}.infrastructure.models")
    except ModuleNotFoundError:
        continue

auth_header = APIKeyHeader(name="Authorization", auto_error=False)
app = FastAPI(
    dependencies=[Depends(auth_header)]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthTokenMiddleware)
app.include_router(auth_router)
app.include_router(note_router)
app.include_router(template_router)
