from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db.session import get_db
from app.modules.note.interfaces.schemas import NoteQuerySchema
from app.modules.user.application.service import get_user_or_none

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("")
def list_notes(params: NoteQuerySchema = Depends(), user = Depends(get_user_or_none), db: Session = Depends(get_db)):
    print(params, user)
    return []
