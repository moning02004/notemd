from typing import Literal

import pydantic
from pydantic import ConfigDict

# Preference 모델의 Enum 과 같은 값들. 여기서 걸러야 잘못된 값이 DB 까지 내려가지 않는다.
TrashPolicy = Literal["15_DAYS", "30_DAYS", "NEVER"]
SnapshotPolicy = Literal["ON_FIRST_EDIT", "ON_EVERY_EDIT", "MANUAL"]


class PreferenceUpdateRequest(pydantic.BaseModel):
    trash_policy: TrashPolicy | None = None
    snapshot_policy: SnapshotPolicy | None = None


class PreferenceResponse(pydantic.BaseModel):
    is_superuser: bool
    trash_policy: str
    snapshot_policy: str

    model_config = ConfigDict(from_attributes=True)