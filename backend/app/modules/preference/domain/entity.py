from dataclasses import dataclass


@dataclass
class PreferenceEntity:
    user_id: int
    trash_policy: str
    snapshot_policy: str