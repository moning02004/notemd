from dataclasses import dataclass

from fastapi_clean_archi.core.auth import verify_password


@dataclass
class UserEntity:
    id: int
    hashed_password: str

    def check_password(self, password: str) -> bool:
        return verify_password(password, self.hashed_password)


@dataclass
class UserSignupEntity:
    username: str
    hashed_password: str
    name: str
