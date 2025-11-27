import uuid

from sqlalchemy import Column, Integer, DateTime, func, String, event
from sqlalchemy.orm import as_declarative, declarative_base, declared_attr, Session

Base = declarative_base()


@as_declarative()
class BaseModel(Base):
    __abstract__ = True

    pk = Column("id", Integer, primary_key=True, index=True)
    hash_id = Column(String(100), nullable=False, unique=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @declared_attr
    def __tablename__(cls):
        meta = getattr(cls, "Meta", None)
        if meta and hasattr(meta, "db_table"):
            return meta.db_table
        return cls.__name__.lower()


@event.listens_for(Session, "before_flush")
def generate_hash_id(session, flush_context, instances):
    for instance in session.new:
        if instance.hash_id is None:
            instance.hash_id = str(uuid.uuid4().hex)
