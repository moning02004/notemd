from fastapi import Depends

from app.core.session import get_db
from app.modules.workspace.application.service import WorkspaceService
from app.modules.workspace.infrastructure.repository import WorkspaceRepository


def get_workspace_serivce(db=Depends(get_db)) -> WorkspaceService:
    repository = WorkspaceRepository(db)
    return WorkspaceService(repository)
