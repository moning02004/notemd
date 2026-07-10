from fastapi import APIRouter, Depends

from app.core.dependancies import get_current_user
from app.modules.preference.application.service import PreferenceService
from app.modules.preference.interfaces.dependencies import get_preference_service
from app.modules.preference.interfaces.schemas import PreferenceResponse, PreferenceUpdateRequest

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get("", response_model=PreferenceResponse)
def get_preference(user=Depends(get_current_user), service: PreferenceService = Depends(get_preference_service)):
    preference = service.get_preference(user_id=user.pk)
    return preference


@router.patch("", response_model=PreferenceResponse)
def update_preference(request: PreferenceUpdateRequest, user=Depends(get_current_user),
                      service: PreferenceService = Depends(get_preference_service)):
    preference = service.update_preference(user_id=user.pk, request=request)
    return preference