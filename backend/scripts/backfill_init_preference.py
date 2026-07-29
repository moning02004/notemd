from sqlalchemy import update

from app.modules.preference.infrastructure.models import Preference
from app.modules.user.infrastructure.models import User
from scripts._base import BackfillScript


class Backfill(BackfillScript):
    name = "backfill_init_preference"
    target_table = Preference

    @classmethod
    def add_arguments(cls, parser):
        return parser

    def unfilled_condition(self):
        return Preference.trash_policy.notin_(["15_DAYS", "30_DAYS", "NEVER"])

    def key_columns(self):
        return Preference.pk, User.username

    def apply(self, db, row):
        db.execute(
            update(Preference)
            .values(trash_policy="15_DAYS")
        )


if __name__ == "__main__":
    Backfill().main()
