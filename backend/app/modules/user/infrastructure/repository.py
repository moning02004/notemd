from app.core.commons.repository import Repository

from app.modules.user.infrastructure.models import User


class UserRepository(Repository):
    DB_MODEL = User
