import importlib
import os


def get_settings():
    settings_file = os.environ.get("SETTINGS_FILE") or "local"
    if os.path.isdir("app/core/config"):
        module = importlib.import_module(f"app.core.config.{settings_file}")
    else:
        module = importlib.import_module("app.core.config")
    return module.Settings()


settings = get_settings()
