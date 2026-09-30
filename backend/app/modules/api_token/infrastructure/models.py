from fastapi_clean_archi.core.db.base import BaseModel
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class ApiToken(BaseModel):
    """AI 에이전트 같은 프로그램이 노트를 쓰고 읽을 때 쓰는 개인 API 토큰.

    토큰 원문은 만들 때 한 번만 보여주고, 여기에는 SHA-256 해시만 남긴다. 무작위 32바이트라
    느린 비밀번호 해시가 필요 없고, 해시로 곧바로 찾을 수 있어야 요청마다 빠르게 확인한다.
    """
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    # 목록에서 어느 토큰인지 알아보게 보여주는 앞부분(mdn_ab12cd). 이것만으로는 쓸 수 없다.
    prefix = Column(String, nullable=False)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    # write: 노트 만들기·덧붙이기 / read_write: 여기에 더해 노트 찾기·읽기
    scope = Column(String, nullable=False, default="write")
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
