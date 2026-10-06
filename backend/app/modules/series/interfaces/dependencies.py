from fastapi import Depends

from app.core.session import get_db
from app.core.storages import get_storage
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.series.application.service import SeriesService
from app.modules.series.infrastructure.repository import SeriesRepository


def get_series_service(db=Depends(get_db)) -> SeriesService:
    return SeriesService(SeriesRepository(db))


def get_series_service_with_storage(db=Depends(get_db), storage=Depends(get_storage)) -> SeriesService:
    """내보내기는 노트를 그리는 일(PDF 의 이미지 포함)을 노트 서비스에 맡긴다."""
    return SeriesService(SeriesRepository(db), note_service=NoteService(NoteRepository(db), storage=storage))
