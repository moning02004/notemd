from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.orm import relationship


class Preference(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, unique=True)

    trash_policy = Column(String, nullable=False, default="30_DAYS")
    snapshot_policy = Column(String, nullable=False, default="MANUAL")

    # relationships
    user = relationship("User", back_populates="preference")

    @property
    def is_superuser(self):
        return self.user.is_superuser