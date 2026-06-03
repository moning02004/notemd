from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.core.search import service as search_service
from app.core.session import get_db
from app.core.storages import get_storage
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.note.interfaces.schemas import NoteListSchema, NoteCreateSchema, \
    NoteDetailSchema, NoteUpdateRequest, QueryParams, get_query_params
from app.modules.user.application.service import get_current_user, get_user_or_none

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("", response_model=list[NoteListSchema])
def list_notes(user=Depends(get_current_user), db=Depends(get_db), query: QueryParams = Depends(get_query_params)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    if query.keyword is None:
        notes = service.list_notes(user_id=user.pk,
                                   is_deleted=bool(query.is_deleted),
                                   tag=query.tag,
                                   sort=query.sort,
                                   page=query.page)
    else:
        notes = search_service.search_notes(query=query.keyword, repository=repository)
        print(notes)
    return notes


@router.post("", response_model=NoteCreateSchema)
def create_note(user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.create_default_note(user_id=user.pk)
    return note


@router.get("/{note_id}", response_model=NoteDetailSchema | None)
def get_note(note_id: str, user=Depends(get_user_or_none), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.get_note_by_hash_id(user_id=user and user.pk, note_id=note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    return note


@router.patch("/{note_id}", response_model=NoteDetailSchema)
def update_note(request: NoteUpdateRequest, note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.update_note(user_id=user.pk, note_id=note_id, request=request)
    return note


@router.post("/{note_id}/images")
async def create_note_image(note_id: str, file: UploadFile = File(...),
                            user=Depends(get_current_user),
                            db=Depends(get_db),
                            storage=Depends(get_storage)):
    repository = NoteRepository(db)
    service = NoteService(repository, storage)
    return await service.create_note_image(user_id=user.pk, note_id=note_id, file=file)


@router.delete("/{note_id}")
def delete_note(note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.soft_delete_note(user_id=user.pk, note_id=note_id)
    return note


@router.delete("/{note_id}/permanently")
def permanency_delete_note(note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.hard_delete_note(user_id=user.pk, note_id=note_id)
    return note


@router.patch("/{note_id}/restore")
def restore_note(note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.restore_note(user_id=user.pk, note_id=note_id)
    return note
