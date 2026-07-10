from fastapi import APIRouter, Depends

from app.modules.template.application.service import TemplateService
from app.modules.template.interfaces.dependencies import get_template_service
from app.modules.template.interfaces.schemas import TemplateListSchema, TemplateCreateRequest, TemplateDetailSchema
from app.core.dependancies import get_current_user

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("", response_model=list[TemplateListSchema])
def list_templates(user=Depends(get_current_user), service: TemplateService = Depends(get_template_service)):
    templates = service.list_templates(user_id=user.pk)
    return templates


@router.post("", response_model=TemplateDetailSchema)
def create_template(request: TemplateCreateRequest, user=Depends(get_current_user),
                    service: TemplateService = Depends(get_template_service)):
    template = service.create_template(user_id=user.pk, request=request)
    return template


@router.get("/{template_id}", response_model=TemplateDetailSchema)
def get_template(template_id: str, user=Depends(get_current_user),
                 service: TemplateService = Depends(get_template_service)):
    template = service.get_template_by_hash_id(user_id=user.pk, template_id=template_id)
    return template


@router.delete("/{template_id}")
def delete_template(template_id: str, user=Depends(get_current_user),
                    service: TemplateService = Depends(get_template_service)):
    service.delete_template(user_id=user.pk, template_id=template_id)
    return {"message": "OK"}
