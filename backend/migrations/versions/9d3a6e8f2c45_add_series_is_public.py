"""add_series_is_public

Revision ID: 9d3a6e8f2c45
Revises: 8c2f5d7e1b34
Create Date: 2026-10-06 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d3a6e8f2c45'
down_revision: Union[str, Sequence[str], None] = '8c2f5d7e1b34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('series', sa.Column('is_public', sa.Boolean(), server_default=sa.text('false'), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('series', 'is_public')
