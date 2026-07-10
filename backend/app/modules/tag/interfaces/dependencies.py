from fastapi import Depends

from app.core.session import get_db
from app.modules.tag.application.service import TagService
from app.modules.tag.infrastructure.repository import TagRepository


def get_tag_service(db=Depends(get_db)) -> TagService:
    repository = TagRepository(db)
    return TagService(repository)
