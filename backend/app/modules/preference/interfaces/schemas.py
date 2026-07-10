import pydantic
from pydantic import ConfigDict


class PreferenceUpdateRequest(pydantic.BaseModel):
    trash_policy: str | None = None
    snapshot_policy: str | None = None


class PreferenceResponse(pydantic.BaseModel):
    is_superuser: bool
    trash_policy: str
    snapshot_policy: str

    model_config = ConfigDict(from_attributes=True)