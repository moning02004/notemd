"""add listing indexes

목록·개수·스냅샷·태그·공유 노트 조회가 표 전체를 훑던 것을 인덱스로 바꾼다(모델의 __table_args__ 와 같다).
노트 10만 개에서 목록 본쿼리 219ms → 2ms, 스냅샷 목록 167ms → 3ms(scripts/perf).

CONCURRENTLY 로 만들어 만드는 동안에도 노트를 읽고 쓸 수 있다. 그래서 트랜잭션 밖(autocommit_block)에서 돈다.
도중에 멈추면 INVALID 인덱스가 남을 수 있다. 그때는 downgrade 하거나 그 인덱스를 지우고 다시 올린다.

Revision ID: b4e7c1a9d2f3
Revises: 9d3a6e8f2c45
Create Date: 2026-10-21 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4e7c1a9d2f3'
down_revision: Union[str, Sequence[str], None] = '9d3a6e8f2c45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LIVE = sa.text("deleted_at IS NULL")
TRASHED = sa.text("deleted_at IS NOT NULL")

# (이름, 표, 열, 조건, INCLUDE 열)
INDEXES = [
    ("ix_note_user_updated_live", "note", ["user_id", "updated_at"], LIVE, ["id"]),
    ("ix_note_user_created_live", "note", ["user_id", "created_at"], LIVE, None),
    ("ix_note_user_folder_live", "note", ["user_id", "folder_id", "updated_at"], LIVE, None),
    ("ix_note_user_trashed", "note", ["user_id", "deleted_at"], TRASHED, None),
    ("ix_notesnapshot_note_created", "notesnapshot", ["note_id", "created_at"], None, None),
    ("ix_notetag_tag_id", "notetag", ["tag_id"], None, None),
    ("ix_workspace_note_workspace_id", "workspace_note", ["workspace_id"], None, None),
]


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for name, table, columns, where, include in INDEXES:
            op.create_index(name, table, columns, unique=False, if_not_exists=True,
                            postgresql_concurrently=True, postgresql_where=where, sqlite_where=where,
                            postgresql_include=include or [])


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, table, *_ in reversed(INDEXES):
            op.drop_index(name, table_name=table, if_exists=True, postgresql_concurrently=True)
