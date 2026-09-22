from dataclasses import dataclass, field
from typing import List


@dataclass
class FolderEntity:
    user_id: int
    name: str
    parent_id: int | None = None


@dataclass
class FolderNode:
    """트리 한 칸. 프론트가 그대로 그릴 수 있도록 경로와 두 가지 개수를 함께 담는다."""
    hash_id: str
    name: str
    parent_hash: str | None
    depth: int
    path: str
    # 이 폴더에 직접 들어 있는 노트 수
    note_count: int = 0
    # 하위 폴더까지 합한 수. 접혀 있을 때 이 값을 보여주면 숫자가 두 번 세어지지 않는다.
    total_count: int = 0
    children: List["FolderNode"] = field(default_factory=list)
