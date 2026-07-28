from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, Integer, ForeignKey, String, Enum
from sqlalchemy.orm import relationship


class Preference(BaseModel):
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, unique=True)

    snapshot_policy = Column(Enum("ON_FIRST_EDIT", "ON_EVERY_EDIT", "MANUAL",
                               name="snapshot_policy_enum",
                               native_enum=False), nullable=False, default="MANUAL")
    trash_policy = Column(Enum("15_DAYS", "30_DAYS", "NEVER",
                               name="trash_policy_enum",
                               native_enum=False), nullable=False, default="30_DAYS")

    # relationships
    user = relationship("User", back_populates="preference")

    @property
    def is_superuser(self):
        return self.user.is_superuser
