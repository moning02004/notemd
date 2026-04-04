from typing import List

from fastapi import APIRouter, Depends
from fastapi.params import Query

from app.core.session import get_db
from app.modules.tag.application.service import TagService
from app.modules.tag.infrastructure.repository import TagRepository
from app.modules.tag.interfaces.schemas import TagListSchema
from app.modules.user.application.service import get_current_user

router = APIRouter(prefix="/tags", tags=["Tag"])


@router.get("", response_model=List[TagListSchema])
def list_tags(user=Depends(get_current_user), db=Depends(get_db), total: int = 1):
    repository = TagRepository(db)
    service = TagService(repository)
    tags = service.list_tags_with_note_count(total=total)
    return tags
