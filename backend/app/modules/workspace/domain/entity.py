from dataclasses import dataclass


@dataclass
class WorkspaceEntity:
    hash_id: str
    name: str
    description: str
    user_count: int

    @classmethod
    def from_orm(cls, workspace):
        return cls(
            hash_id=workspace.hash_id,
            name=workspace.name,
            description=workspace.description,
            user_count=workspace.user_count,
        )
