from fastapi import Depends

from app.core.session import get_db
from app.modules.template.application.service import TemplateService
from app.modules.template.infrastructure.repository import TemplateRepository


def get_template_service(db=Depends(get_db)) -> TemplateService:
    repository = TemplateRepository(db)
    return TemplateService(repository)
