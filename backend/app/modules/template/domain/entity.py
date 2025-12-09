from dataclasses import dataclass


@dataclass
class TemplateEntity:
    user_id: id
    title: str
    content: str