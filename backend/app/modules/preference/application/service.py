from fastapi_clean_archi.core.commons.service import Service

DEFAULT_TRASH_POLICY = "30_DAYS"
DEFAULT_SNAPSHOT_POLICY = "MANUAL"


class PreferenceService(Service):

    def get_preference(self, user_id: int):
        preference = self.repository.get_by_user_id(user_id)
        if preference is None:
            preference = self.repository.create_preference(user_id=user_id)
        return preference

    def update_preference(self, user_id: int, request):
        preference = self.get_preference(user_id)
        columns = request.model_dump(exclude_unset=True)
        return self.repository.update_preference(preference, **columns)