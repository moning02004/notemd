from fastapi import Depends

from app.core.session import get_db
from app.core.storages import get_storage
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository


def get_note_service(db=Depends(get_db)) -> NoteService:
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())
    return NoteService(repository, search_service=search_service)


def get_note_service_with_storage(db=Depends(get_db), storage=Depends(get_storage)) -> NoteService:
    repository = NoteRepository(db)
    return NoteService(repository, storage=storage)
