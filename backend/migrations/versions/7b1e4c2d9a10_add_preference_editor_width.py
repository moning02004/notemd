"""add preference editor width

Revision ID: 7b1e4c2d9a10
Revises: 3a5eadebb682
Create Date: 2026-10-02 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b1e4c2d9a10'
down_revision: Union[str, Sequence[str], None] = '3a5eadebb682'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 지금까지는 늘 넓게(100%)로 열렸다. 있던 사람도 같은 폭에서 시작한다.
    op.add_column('preference', sa.Column('editor_width',
                                          sa.Enum('WIDE', 'NORMAL', 'NARROW', name='editor_width_enum',
                                                  native_enum=False),
                                          nullable=False, server_default='WIDE'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('preference', 'editor_width')
