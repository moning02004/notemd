import jwt
from passlib.context import CryptContext

from app.core.security import decode_jwt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def verify_refresh_token(token):
    try:
        decode_jwt(token)
        return True
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return False
