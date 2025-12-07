from fastapi_clean_archi.core.config import AbstractSettings


class Settings(AbstractSettings):
    APP_NAME: str = "FastAPI clean architecture"

    # JWT settings
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: str = "1D"
    REFRESH_TOKEN_EXPIRE_MINUTES: str = "30D"

    # Application settings
    DEBUG: bool = True
    SECRET_KEY: str = "bkSqk0RAOx6SCsiE1An0c4rJIjlhCEfxKWTdKrfO98g"

    # Database settings
    DATABASE = {
        "driver": "sqlite",
        "name": "sqlite.db",
        "user": "",
        "password": "",
        "host": "",
        "port": "",
    }

    # CORS settings
    CORS_ORIGINS = [
        "http://localhost:3000",
    ]


settings = Settings()
