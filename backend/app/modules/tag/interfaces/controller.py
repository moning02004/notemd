from typing import List

from fastapi import APIRouter, Depends

from app.modules.tag.application.service import TagService
from app.modules.tag.interfaces.dependencies import get_tag_service
from app.modules.tag.interfaces.schemas import TagListSchema
from app.core.dependancies import get_current_user

router = APIRouter(prefix="/tags", tags=["Tag"])


@router.get("", response_model=List[TagListSchema])
def list_tags(user=Depends(get_current_user), total: int = 1, service: TagService = Depends(get_tag_service)):
    tags = service.list_tags_with_note_count(user=user, total=total)
    return tags
