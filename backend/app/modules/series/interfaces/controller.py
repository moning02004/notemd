from typing import List
from urllib.parse import quote

from fastapi import APIRouter, Depends
from starlette.responses import Response

from app.core.dependancies import get_current_user
from app.modules.series.application.service import SeriesService
from app.modules.series.interfaces.dependencies import get_series_service, get_series_service_with_storage
from app.modules.series.interfaces.schemas import (NoteSeriesSchema, SeriesCreateRequest, SeriesDetailSchema,
                                                   SeriesDownloadRequest, SeriesSchema, SeriesUpdateRequest)

router = APIRouter(prefix="/series", tags=["Series"])


@router.get("", response_model=List[SeriesSchema])
def list_series(user=Depends(get_current_user), service: SeriesService = Depends(get_series_service)):
    return service.list_series(user_id=user.pk)


@router.post("", response_model=SeriesDetailSchema, status_code=201)
def create_series(request: SeriesCreateRequest, user=Depends(get_current_user),
                  service: SeriesService = Depends(get_series_service)):
    return service.create_series(user_id=user.pk, request=request)


@router.get("/by-note/{note_hash}", response_model=List[NoteSeriesSchema])
def list_series_of_note(note_hash: str, user=Depends(get_current_user),
                        service: SeriesService = Depends(get_series_service)):
    """/{series_hash} 보다 먼저 두어야 'by-note' 가 시리즈 id 로 잡히지 않는다."""
    return service.series_of_note(user_id=user.pk, note_hash=note_hash)


@router.get("/{series_hash}", response_model=SeriesDetailSchema)
def get_series(series_hash: str, user=Depends(get_current_user),
               service: SeriesService = Depends(get_series_service)):
    return service.get_series(user_id=user.pk, series_hash=series_hash)


@router.patch("/{series_hash}", response_model=SeriesDetailSchema)
def update_series(series_hash: str, request: SeriesUpdateRequest, user=Depends(get_current_user),
                  service: SeriesService = Depends(get_series_service)):
    return service.update_series(user_id=user.pk, series_hash=series_hash, request=request)


@router.delete("/{series_hash}", status_code=204)
def delete_series(series_hash: str, user=Depends(get_current_user),
                  service: SeriesService = Depends(get_series_service)):
    """시리즈만 지운다. 안에 있던 노트는 그대로 남는다."""
    service.delete_series(user_id=user.pk, series_hash=series_hash)


@router.post("/{series_hash}/download")
async def download_series(series_hash: str, request: SeriesDownloadRequest | None = None,
                          user=Depends(get_current_user),
                          service: SeriesService = Depends(get_series_service_with_storage)):
    result = await service.download_series(user=user, series_hash=series_hash,
                                           file_format=request.file_format if request else "pdf")
    encoded_filename = quote(result.filename)
    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={"Content-Disposition": f"attachment; filename=\"{encoded_filename}\"; "
                                        f"filename*=UTF-8''{encoded_filename}"},
    )
