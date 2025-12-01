from copy import deepcopy
from datetime import datetime, timedelta

from app.core.config import settings
import jwt


class JWTManager:
    current_time = None

    def get_payload(self, data, value):
        payload = deepcopy(data)
        number, _type = value[:-1], value[-1]
        _type = _type.upper()

        if _type == "D":
            timedelta_params = {"days": int(number)}
        elif _type == "M":
            timedelta_params = {"minutes": int(number)}
        elif _type == "S":
            timedelta_params = {"seconds": int(number)}
        else:
            timedelta_params = {"seconds": 3600}
        expired_at = self.current_time + timedelta(**timedelta_params)

        payload.update({"exp": int(expired_at.timestamp())})
        payload.update({"iat": int(self.current_time.timestamp())})
        return payload

    def create(self, data):
        self.current_time = datetime.now()

        access_payload = self.get_payload(data, settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_payload = self.get_payload(data, settings.REFRESH_TOKEN_EXPIRE_MINUTES)

        return {
            "access_token": jwt.encode(access_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM),
            "refresh_token": jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        }

    def decode_payload(self, token: str) -> dict:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


jwt_manager = JWTManager()
