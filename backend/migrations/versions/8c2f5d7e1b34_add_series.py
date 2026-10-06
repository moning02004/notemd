"""add_series

Revision ID: 8c2f5d7e1b34
Revises: 7b1e4c2d9a10
Create Date: 2026-10-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c2f5d7e1b34'
down_revision: Union[str, Sequence[str], None] = '7b1e4c2d9a10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('series',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('hash_id', sa.String(length=100), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('hash_id')
    )
    op.create_index(op.f('ix_series_id'), 'series', ['id'], unique=True)
    op.create_index(op.f('ix_series_user_id'), 'series', ['user_id'], unique=False)
    op.create_table('series_note',
    sa.Column('series_id', sa.Integer(), nullable=False),
    sa.Column('note_id', sa.Integer(), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['note_id'], ['note.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['series_id'], ['series.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('series_id', 'note_id')
    )
    op.create_index(op.f('ix_series_note_note_id'), 'series_note', ['note_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_series_note_note_id'), table_name='series_note')
    op.drop_table('series_note')
    op.drop_index(op.f('ix_series_user_id'), table_name='series')
    op.drop_index(op.f('ix_series_id'), table_name='series')
    op.drop_table('series')
