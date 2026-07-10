from fastapi import Depends

from app.core.session import get_db
from app.modules.preference.application.service import PreferenceService
from app.modules.preference.infrastructure.repository import PreferenceRepository


def get_preference_service(db=Depends(get_db)) -> PreferenceService:
    repository = PreferenceRepository(db)
    return PreferenceService(repository)