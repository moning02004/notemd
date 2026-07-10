from pydantic import BaseModel, ConfigDict


class WorkspaceCreateRequest(BaseModel):
    name: str
    description: str


class WorkspaceInfoResponse(BaseModel):
    hash_id: str
    name: str
    description: str
    user_count: int

    model_config = ConfigDict(from_attributes=True)


class WorkspaceUserResponse(BaseModel):
    user_hash: str
    user_name: str
    username: str
