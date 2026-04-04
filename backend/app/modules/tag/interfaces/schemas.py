from pydantic import BaseModel, ConfigDict


class TagListSchema(BaseModel):
    keyword: str
    count: int

    model_config = ConfigDict(from_attributes=True)
