from datetime import datetime

import pydantic
from pydantic import ConfigDict, field_serializer


class TokenObtainSchema(pydantic.BaseModel):
    username: str
    password: str


class SignupSchema(pydantic.BaseModel):
    username: str
    password1: str = None
    password2: str = None
    name: str


class ChangePasswordRequest(pydantic.BaseModel):
    current_password: str
    new_password1: str
    new_password2: str


class ExistsResponse(pydantic.BaseModel):
    exists: bool


class TokenResponse(pydantic.BaseModel):
    access_token: str
    user_hash: str


class UserCreateResponse(pydantic.BaseModel):
    user_hash: str

    model_config = ConfigDict(from_attributes=True)


class UserInfoResponse(pydantic.BaseModel):
    user_hash: str
    username: str
    name: str
    is_approval: bool | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime, _info):
        return value.strftime("%Y-%m-%d %H:%M:%S")


class MessageResponse(pydantic.BaseModel):
    message: str
