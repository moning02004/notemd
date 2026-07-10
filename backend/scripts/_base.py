"""백필 스크립트 공통 베이스.

새 백필 스크립트는 이 클래스를 상속해서 4가지만 채우면 된다.

    class BackfillXxx(BackfillScript):
        name = "backfill_xxx"
        target_table = xxx_table

        def unfilled_condition(self):
            return xxx_table.c.some_column.is_(None)

        def key_columns(self):
            return xxx_table.c.id,

        def apply(self, db, row):
            db.execute(update(xxx_table).where(xxx_table.c.id == row.id).values(some_column="기본값"))

    if __name__ == "__main__":
        BackfillXxx().main()

베이스가 공통으로 처리하는 것:
  - --batch-size / --dry-run / --env CLI 인자
  - 대상 건수 카운트 (dry-run은 여기서 끝)
  - 배치 조회 -> apply -> 배치 단위 commit 루프 (한 트랜잭션에 전부 묶지 않음)
  - 진행 로그
  - 완료 후, logs/db_migration.md 실행 이력에 붙여넣을 한 줄 출력
    (컨테이너에 repo 루트가 마운트돼 있지 않아 파일에 직접 쓰지 못하므로, 사람이 복사해서 남긴다)
"""
import abc
import argparse
import logging
from datetime import datetime

from sqlalchemy import select, func

from app.core.session import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


class BackfillScript(abc.ABC):
    name: str
    default_batch_size: int = 500

    def __init__(self):
        self.logger = logging.getLogger(self.name)

    @property
    @abc.abstractmethod
    def target_table(self):
        """대상 Table (또는 매핑된 모델의 __table__)."""
        raise NotImplementedError

    @abc.abstractmethod
    def unfilled_condition(self):
        """아직 안 채워진 row를 찾는 WHERE 조건. 재실행해도 안전하려면(멱등) 필수."""
        raise NotImplementedError

    @abc.abstractmethod
    def key_columns(self):
        """배치 조회 시 가져올 PK 컬럼들의 튜플."""
        raise NotImplementedError

    @abc.abstractmethod
    def apply(self, db, row) -> None:
        """row(=key_columns 로 조회된 한 건) 하나를 채우는 UPDATE 를 실행. commit은 베이스가 배치 단위로 처리."""
        raise NotImplementedError

    def _count_target(self, db) -> int:
        return db.execute(
            select(func.count()).select_from(self.target_table).where(self.unfilled_condition())
        ).scalar()

    def run(self, batch_size: int, dry_run: bool) -> int:
        db = SessionLocal()
        try:
            target_count = self._count_target(db)
            if target_count == 0:
                self.logger.info("채울 대상이 없습니다.")
                return 0

            if dry_run:
                self.logger.info("[dry-run] %d건 발견. 실제 변경 없음.", target_count)
                return target_count

            total = 0
            while True:
                rows = db.execute(
                    select(*self.key_columns()).where(self.unfilled_condition()).limit(batch_size)
                ).all()
                if not rows:
                    break

                for row in rows:
                    self.apply(db, row)
                db.commit()

                total += len(rows)
                self.logger.info("%d건 처리 (누적 %d/%d)", len(rows), total, target_count)

            return total
        finally:
            db.close()

    def main(self):
        parser = argparse.ArgumentParser(description=self.name)
        parser.add_argument("--batch-size", type=int, default=self.default_batch_size,
                           help="한 트랜잭션에 채울 최대 row 수")
        parser.add_argument("--dry-run", action="store_true", help="실제로 채우지 않고 대상 건수만 확인")
        parser.add_argument("--env", default="unknown", help="실행 이력에 남길 환경 이름 (dev/staging/prod 등)")
        args = parser.parse_args()

        total = self.run(batch_size=args.batch_size, dry_run=args.dry_run)
        self.logger.info("완료. 총 %d건 처리.", total)

        if not args.dry_run and total > 0:
            today = datetime.now().strftime("%Y-%m-%d")
            self.logger.info(
                "실행 이력에 아래 줄을 logs/db_migration.md 에 추가하세요:\n| %s | %s | %s | %d |",
                today, self.name, args.env, total,
            )
