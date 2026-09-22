from fastapi import Depends

from app.core.session import get_db
from app.modules.folder.application.service import FolderService
from app.modules.folder.infrastructure.repository import FolderRepository
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository


def get_folder_service(db=Depends(get_db)) -> FolderService:
    repository = FolderRepository(db)
    return FolderService(repository, search_service=SearchService(SearchRepository()))
