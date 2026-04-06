from fastapi import APIRouter, Depends

from app.core.session import get_db
from app.modules.template.application.service import TemplateService
from app.modules.template.infrastructure.repository import TemplateRepository
from app.modules.template.interfaces.schemas import TemplateListSchema, TemplateCreateRequest, TemplateDetailSchema
from app.modules.user.application.service import get_current_user

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("", response_model=list[TemplateListSchema])
def list_templates(user=Depends(get_current_user), db=Depends(get_db)):
    repository = TemplateRepository(db)
    service = TemplateService(repository)
    templates = service.list_templates(user_id=user.pk)
    return templates


@router.post("", response_model=TemplateDetailSchema)
def create_template(request: TemplateCreateRequest, user=Depends(get_current_user), db=Depends(get_db)):
    repository = TemplateRepository(db)
    service = TemplateService(repository)
    template = service.create_template(user_id=user.pk, request=request)
    return template


@router.get("/{template_id}", response_model=TemplateDetailSchema)
def get_template(template_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = TemplateRepository(db)
    service = TemplateService(repository)
    template = service.get_template_by_hash_id(user_id=user.pk, template_id=template_id)
    return template


@router.delete("/{template_id}")
def delete_template(template_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    repository = TemplateRepository(db)
    service = TemplateService(repository)
    service.delete_template(user_id=user.pk, template_id=template_id)
    return {"message": "OK"}
