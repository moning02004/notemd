from fastapi import APIRouter, Depends

from app.core.session import get_db
from app.modules.note.application.service import NoteService
from app.modules.note.infrastructure.repository import NoteRepository
from app.modules.note.interfaces.schemas import NoteListSchema, NoteCreateSchema, \
    NoteDetailSchema, NoteUpdateRequest
from app.modules.user.application.service import get_current_user

note_router = APIRouter(prefix="/notes", tags=["Notes"])


@note_router.get("", response_model=list[NoteListSchema])
def list_notes(user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    notes = service.list_notes(user_id=user.pk)
    return notes


@note_router.post("", response_model=NoteCreateSchema)
def create_note(user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.create_default_note(user_id=user.pk)
    return note


@note_router.get("/{note_id}", response_model=NoteDetailSchema)
def get_note(note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.get_note_by_hash_id(user_id=user.pk, note_id=note_id)
    return note


@note_router.patch("/{note_id}", response_model=NoteDetailSchema)
def update_note(request: NoteUpdateRequest, note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.update_note(user_id=user.pk, note_id=note_id, request=request)
    return note


@note_router.delete("/{note_id}")
def delete_note(note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.soft_delete_note(user_id=user.pk, note_id=note_id)
    return note


@note_router.delete("/{note_id}/permanently")
def permanency_delete_note(note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.hard_delete_note(user_id=user.pk, note_id=note_id)
    return note


@note_router.patch("/{note_id}/restore")
def restore_note(note_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = NoteRepository(db)
    service = NoteService(repository)
    note = service.restore_note(user_id=user.pk, note_id=note_id)
    return note
