import pydantic


class NoteQuerySchema(pydantic.BaseModel):
    order_by: str | None = "id"
    limit: int | None = 5
