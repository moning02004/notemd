from datetime import datetime, timezone
from typing import List

from fastapi_clean_archi.core.commons.repository import Repository
from sqlalchemy import desc

from app.modules.api_token.infrastructure.models import ApiToken


class ApiTokenRepository(Repository):
    DB_MODEL = ApiToken

    def create_token(self, user_id: int, name: str, prefix: str, token_hash: str, scope: str) -> ApiToken:
        token = ApiToken(user_id=user_id, name=name, prefix=prefix, token_hash=token_hash, scope=scope)
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)
        return token

    def list_by_user_id(self, user_id: int) -> List[ApiToken]:
        return self.db.query(ApiToken).filter(ApiToken.user_id == user_id).order_by(desc(ApiToken.created_at)).all()

    def get_by_hash_id_and_user_id(self, user_id: int, hash_id: str) -> ApiToken | None:
        return self.db.query(ApiToken).filter(ApiToken.user_id == user_id, ApiToken.hash_id == hash_id).first()

    def find_by_token_hash(self, token_hash: str) -> ApiToken | None:
        return self.db.query(ApiToken).filter(ApiToken.token_hash == token_hash).first()

    def touch(self, token: ApiToken) -> None:
        token.last_used_at = datetime.now(timezone.utc)
        self.db.commit()

    def delete_token(self, token: ApiToken) -> None:
        self.db.delete(token)
        self.db.commit()
