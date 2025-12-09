from pydantic import BaseModel, ConfigDict


class TemplateCreateRequest(BaseModel):
    title: str
    content: str


class TemplateListSchema(BaseModel):
    id: int
    title: str
    content: str

    model_config = ConfigDict(from_attributes=True)


class TemplateDetailSchema(BaseModel):
    title: str
    content: str

    model_config = ConfigDict(from_attributes=True)
