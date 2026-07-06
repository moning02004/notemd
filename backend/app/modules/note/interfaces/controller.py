from typing import List
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from starlette.responses import Response

from app.core.session import get_db
from app.core.storages import get_storage
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.note.interfaces.schemas import NoteListSchema, NoteCreateSchema, \
    NoteDetailSchema, NoteUpdateRequest, QueryParams, NoteHashesRequest, SnapshotRequest, NoteSnapshotSchema
from app.modules.search.application.service import SearchService
from app.modules.search.infrastructure.repository import SearchRepository
from app.modules.user.application.service import get_current_user, get_user_or_none

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("", response_model=list[NoteListSchema])
def list_notes(user=Depends(get_current_user), db=Depends(get_db), query: QueryParams = Depends()):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())
    service = NoteService(repository, search_service)
    notes = service.list_notes(user_hash=user.hash_id,
                               keyword=query.keyword,
                               is_deleted=bool(query.is_deleted),
                               tag=query.tag,
                               sort=query.sort,
                               page=query.page)
    return notes


@router.post("", response_model=NoteCreateSchema)
def create_note(user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())
    service = NoteService(repository, search_service)
    note = service.create_default_note(user_id=user.pk)
    return note


@router.delete("")
def bulk_soft_delete_note(request: NoteHashesRequest, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())

    service = NoteService(repository, search_service)
    note_hashes = service.soft_delete_note(user_id=user.pk, note_hashes=request.note_hashes)
    return note_hashes


@router.delete("/permanently")
def bulk_permanently_delete_note(request: NoteHashesRequest, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())

    service = NoteService(repository, search_service)
    service.hard_delete_note(user_id=user.pk, note_hashes=request.note_hashes)
    return request.note_hashes


@router.patch("/restore")
def bulk_restore_note(request: NoteHashesRequest, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())

    service = NoteService(repository, search_service)
    service.restore_note(user_id=user.pk, note_hashes=request.note_hashes)
    return request.note_hashes


@router.post("/download")
async def download_note(request: NoteHashesRequest, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)

    result = await service.download_note(user_hash=user.hash_id, note_hashes=request.note_hashes)
    encoded_filename = quote(result.filename)

    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{encoded_filename}\"; "
                f"filename*=UTF-8''{encoded_filename}"
            )
        },
    )


@router.post("/files")  # , response_model=list[NoteListSchema])
async def upload_files_and_create_note(files: list[UploadFile] = File(...),
                                       user=Depends(get_current_user),
                                       db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())
    service = NoteService(repository, search_service=search_service)
    return await service.create_note_from_files(user_id=user.pk, files=files)


@router.get("/{note_hash}", response_model=NoteDetailSchema | None)
def get_note(note_hash: str, user=Depends(get_user_or_none), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())
    service = NoteService(repository, search_service)
    note = service.get_note_by_hash_id(user_id=user and user.pk, note_hash=note_hash)
    if note is None:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    return note


@router.patch("/{note_hash}", response_model=NoteDetailSchema)
def update_note(note_hash: str, request: NoteUpdateRequest, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())

    service = NoteService(repository, search_service)
    note = service.update_note(user_id=user.pk, note_hash=note_hash, request=request)
    return note


@router.post("/{note_hash}/images")
async def create_note_image(note_hash: str, file: UploadFile = File(...),
                            user=Depends(get_current_user),
                            db=Depends(get_db),
                            storage=Depends(get_storage)):
    repository = NoteRepository(db)
    service = NoteService(repository, storage)
    return await service.create_note_image(user_id=user.pk, note_hash=note_hash, file=file)


@router.delete("/{note_hash}")
def delete_note(note_hash: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())

    service = NoteService(repository, search_service)
    note_hashes = service.soft_delete_note(user_id=user.pk, note_hashes=[note_hash])
    return note_hashes


@router.delete("/{note_hash}/permanently")
def permanency_delete_note(note_hash: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())

    service = NoteService(repository, search_service)
    note = service.hard_delete_note(user_id=user.pk, note_hashes=[note_hash])
    return note


@router.patch("/{note_hash}/restore")
def restore_note(note_hash: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    search_service = SearchService(SearchRepository())

    service = NoteService(repository, search_service)
    note = service.restore_note(user_id=user.pk, note_hashes=[note_hash])
    return note


@router.get("/{note_hash}/snapshots", response_model=List[NoteSnapshotSchema])
def get_note_snapshots(note_hash: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.get_note_snapshots(user_id=user.pk,
                                      note_hash=note_hash)
    return note


@router.post("/{note_hash}/snapshots", response_model=NoteSnapshotSchema)
def create_note_snapshot(note_hash: str, request: SnapshotRequest, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.create_note_snapshot(user_id=user.pk,
                                        note_hash=note_hash,
                                        description=request.description)
    return note


@router.delete("/{note_hash}/snapshots/{note_snapshot_hash}", status_code=204)
def create_note_snapshot(note_snapshot_hash: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    service.delete_note_snapshot(user_id=user.pk, note_snapshot_hash=note_snapshot_hash)
    return
