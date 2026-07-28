from fastapi_clean_archi.core.commons.repository import Repository

from app.modules.preference.infrastructure.models import Preference


class PreferenceRepository(Repository):
    DB_MODEL = Preference

    def get_by_user_id(self, user_id: int):
        instance = self.db.query(self.DB_MODEL).filter(self.DB_MODEL.user_id == user_id).first()
        return instance

    def create_preference(self, user_id: int) -> Preference:
        instance = self.DB_MODEL(user_id=user_id)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def update_preference(self, instance: Preference, **columns) -> Preference:
        for key, value in columns.items():
            setattr(instance, key, value)
        self.db.commit()
        self.db.refresh(instance)
        return instance