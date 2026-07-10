"""workspace_member.role 백필 스크립트.

컬럼을 nullable=True 로 추가한 뒤, 기존 row(role IS NULL)에 기본값을 채워 넣을 때 쓴다.
공통 로직(배치/dry-run/로깅)은 scripts/_base.py 의 BackfillScript 참고.

사용법 (컨테이너 안에서, 모듈로 실행해야 app.* import 가 풀림):
    python3 -m scripts.backfill_role --dry-run
    python3 -m scripts.backfill_role --env prod
"""
from sqlalchemy import update

from app.modules.workspace.infrastructure.models import workspace_member
from scripts._base import BackfillScript

DEFAULT_ROLE = "member"


class BackfillRole(BackfillScript):
    name = "backfill_role"
    target_table = workspace_member

    def unfilled_condition(self):
        return workspace_member.c.role.is_(None)

    def key_columns(self):
        return workspace_member.c.workspace_id, workspace_member.c.user_id

    def apply(self, db, row):
        db.execute(
            update(workspace_member)
            .where(
                workspace_member.c.workspace_id == row.workspace_id,
                workspace_member.c.user_id == row.user_id,
            )
            .values(role=DEFAULT_ROLE)
        )


if __name__ == "__main__":
    BackfillRole().main()
