import pydantic


class TokenObtainSchema(pydantic.BaseModel):
    username: str
    password: str


class SignupSchema(pydantic.BaseModel):
    username: str
    password1: str
    password2: str
    name: str
