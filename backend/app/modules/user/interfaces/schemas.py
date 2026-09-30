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
    # 관리자 가입(비밀번호를 정해 가입)일 때만 쓴다. 서버의 ADMIN_KEY 와 같아야 한다.
    admin_key: str | None = None


class ChangePasswordRequest(pydantic.BaseModel):
    current_password: str
    new_password1: str
    new_password2: str


class ExistsResponse(pydantic.BaseModel):
    exists: bool


class TokenResponse(pydantic.BaseModel):
    access_token: str
    user_hash: str
    # 임시 비밀번호로 들어왔다. 앱은 새 비밀번호를 정하기 전까지 다른 화면을 보여주지 않는다.
    must_change_password: bool = False


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


class UserCreatedResponse(UserInfoResponse):
    # 관리자가 일반 사용자를 추가했을 때만 채운다. 이 응답에서 한 번만 보여주고 서버에는 해시만 남는다.
    temporary_password: str | None = None


class MessageResponse(pydantic.BaseModel):
    message: str
