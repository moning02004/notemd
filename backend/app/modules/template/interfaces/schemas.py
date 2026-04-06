from pydantic import BaseModel, ConfigDict, field_serializer, computed_field, Field


class TemplateCreateRequest(BaseModel):
    name: str
    description: str
    title: str
    content: str


class TemplateListSchema(BaseModel):
    hash_id: str
    name: str
    description: str
    title: str
    content: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TemplateDetailSchema(BaseModel):
    hash_id: str
    name: str
    description: str
    title: str
    content: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
