import importlib
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from starlette.staticfiles import StaticFiles

from app.core.config import settings
from app.core.middlewares.token import AuthTokenMiddleware
from app.modules.api_token.interfaces.controller import router as api_token_router, v1_router as agent_v1_router
from app.modules.api_token.interfaces.mcp import mcp_app, mcp_server
from app.modules.collab.interfaces.controller import router as collab_router
from app.modules.folder.interfaces.controller import router as folder_router
from app.modules.note.interfaces.controller import router as note_router
from app.modules.preference.interfaces.controller import router as preference_router
from app.modules.search.infrastructure.repository import SearchRepository
from app.modules.series.interfaces.controller import router as series_router
from app.modules.tag.interfaces.controller import router as tag_router
from app.modules.template.interfaces.controller import router as template_router
from app.modules.user.interfaces.auth_controller import router as auth_router
from app.modules.user.interfaces.user_controller import router as user_router
from app.modules.workspace.interfaces.controller import router as workspace_router

modules = os.listdir("app/modules")
for module in modules:
    try:
        importlib.import_module(f"app.modules.{module}.infrastructure.models")
    except ModuleNotFoundError:
        continue


@asynccontextmanager
async def lifespan(app: FastAPI):
    SearchRepository().ensure_index()
    # MCP 서버(/mcp)의 요청 처리기는 앱이 떠 있는 동안 돌아야 한다.
    async with mcp_server.session_manager.run():
        yield


auth_header = APIKeyHeader(name="Authorization", auto_error=False)

app = FastAPI(
    dependencies=[Depends(auth_header)],
    lifespan=lifespan
)

if settings.STORAGE["type"] == "local":
    os.makedirs(settings.STORAGE["name"], exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.STORAGE["name"]), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)
app.add_middleware(AuthTokenMiddleware)

# router 등록
routers = [
    auth_router,
    user_router,
    note_router,
    folder_router,
    series_router,
    template_router,
    tag_router,
    workspace_router,
    preference_router,
    api_token_router,
    agent_v1_router,
    collab_router,
]
for router in routers:
    app.include_router(router)

# AI 에이전트용 MCP 서버(/mcp). 개인 API 토큰으로 확인한다. 미들웨어 없는 라우트 하나라 그대로 옮겨 붙인다.
app.router.routes.extend(mcp_app.routes)
