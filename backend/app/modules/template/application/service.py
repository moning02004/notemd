from fastapi import HTTPException
from fastapi_clean_archi.core.commons.service import Service

from app.modules.template.domain.entity import TemplateEntity


class TemplateService(Service):
    NotFoundTemplate = HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")

    def list_templates(self, user_id: int):
        templates = self.repository.list_by_user_id(user_id)
        return templates

    def create_template(self, user_id: int, request):
        template_entity = TemplateEntity(
            user_id=user_id,
            name=request.name,
            description=request.description,
            title=request.title,
            content=request.content
        )
        return self.repository.create_template(template_entity)

    def get_template_by_hash_id(self, user_id: int, template_id: str):
        template = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=template_id)
        if template is None:
            raise self.NotFoundTemplate
        return template

    def delete_template(self, user_id: int, template_id: str):
        template = self.repository.get_by_hash_id_and_user_id(user_id=user_id, hash_id=template_id)

        if template:
            self.repository.db.delete(template)
            self.repository.db.commit()
        return template

