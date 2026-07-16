"""User.is_superuser 백필 스크립트.

컬럼을 nullable=True 로 추가한 뒤, 기존 row(is_superuser IS NULL)에 기본값을 채워 넣을 때 쓴다.
--username 으로 지정한 사용자만 True 로, 나머지는 전부 False 로 채운다.
공통 로직(배치/dry-run/로깅)은 scripts/_base.py 의 BackfillScript 참고.

사용법 (컨테이너 안에서, 모듈로 실행해야 app.* import 가 풀림):
    python3 -m scripts.backfill_superuser --username admin --dry-run
    python3 -m scripts.backfill_superuser --username admin --env prod
"""
from sqlalchemy import update

from app.modules.user.infrastructure.models import User
from scripts._base import BackfillScript


class BackfillSuperuser(BackfillScript):
    name = "backfill_superuser"
    target_table = User

    @classmethod
    def add_arguments(cls, parser):
        parser.add_argument("--username", help="최고관리자로 설정할 username")
        return parser

    def unfilled_condition(self):
        return User.is_superuser.is_(None)

    def key_columns(self):
        return User.pk, User.username

    def apply(self, db, row):
        db.execute(
            update(User)
            .where(User.pk == row.pk)
            .values(is_superuser=row.username == self.args.username)
        )


if __name__ == "__main__":
    BackfillSuperuser().main()