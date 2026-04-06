from typing import Union

from fastapi_clean_archi.core.commons.repository import Repository

from app.modules.template.infrastructure.models import Template


class TemplateRepository(Repository):
    DB_MODEL = Template

    def list_by_user_id(self, user_id: int):
        instances = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id).all()
        return instances

    def create_template(self, entity) -> Template:
        instance = self.DB_MODEL(user_id=entity.user_id,
                                 name=entity.name,
                                 description=entity.description,
                                 title=entity.title,
                                 content=entity.content)
        self.db.add(instance)
        self.db.commit()
        return instance

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                       self.DB_MODEL.hash_id == hash_id).first()
        return instance

    def update_note(self, user_id: int, hash_id: str, request) -> Union[Template, None]:
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id,
                                                       self.DB_MODEL.hash_id == hash_id).first()
        if instance:
            instance.title = request.title
            instance.content = request.content
            self.db.commit()
            self.db.refresh(instance)
        return instance
