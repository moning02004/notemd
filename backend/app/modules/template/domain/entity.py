from dataclasses import dataclass


@dataclass
class TemplateEntity:
    user_id: int
    name: str
    description: str
    title: str
    content: str