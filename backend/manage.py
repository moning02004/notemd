import importlib
import pkgutil

import typer
from fastapi_clean_archi.managements.commands.base import Command

command_app = typer.Typer()


def auto_register_commands():
    import fastapi_clean_archi.managements.commands as commands
    for _, mod, _ in pkgutil.iter_modules(commands.__path__):
        importlib.import_module(f"fastapi_clean_archi.managements.commands.{mod}")
        for cls in Command.__subclasses__():
            command_class = cls()
            command_app.command(command_class.name)(command_class.execute)


def register_custom_commands():
    try:
        import managements.commands as commands
    except ImportError:
        return

    for _, mod, _ in pkgutil.iter_modules(commands.__path__):
        importlib.import_module(f"managements.commands.{mod}")
        for cls in Command.__subclasses__():
            command_class = cls()
            command_app.command(command_class.name)(command_class.execute)


if __name__ == "__main__":
    auto_register_commands()
    register_custom_commands()
    command_app()
