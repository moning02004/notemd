from copy import deepcopy
from datetime import datetime, timedelta

import jwt

from app.core.config import settings


def create_jwt(data: dict):
    current_time = datetime.now()

    def get_payload(value):
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
        expired_at = current_time + timedelta(**timedelta_params)

        payload.update({"exp": int(expired_at.timestamp())})
        payload.update({"iat": int(current_time.timestamp())})
        return payload

    access_payload = get_payload(settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_payload = get_payload(settings.REFRESH_TOKEN_EXPIRE_MINUTES)

    return {
        "access_token": jwt.encode(access_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM),
        "refresh_token": jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    }


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
