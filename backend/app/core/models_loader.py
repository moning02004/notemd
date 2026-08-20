"""
모든 모듈의 매핑 클래스를 한 번에 등록한다.

relationship 이 상대를 문자열("Template")로 가리키기 때문에, 매퍼가 설정되는 시점에
그 클래스가 import 돼 있지 않으면 이름을 찾지 못하고 InvalidRequestError 로 죽는다.
FastAPI 앱은 라우터를 타고 전 모듈이 딸려 들어오지만 Celery 워커는 tasks 가 쓰는
모델만 import 하므로, 워커 기동 시 여기서 명시적으로 채워준다.
"""
import importlib
import pkgutil

import app.modules


def load_all_models() -> None:
    for module in pkgutil.iter_modules(app.modules.__path__):
        name = f"app.modules.{module.name}.infrastructure.models"
        try:
            importlib.import_module(name)
        except ModuleNotFoundError as err:
            # models 모듈이 없는 모듈은 건너뛴다.
            # 그 안에서 난 import 실패까지 삼키면 원인을 못 찾으니 그대로 올린다.
            if err.name != name:
                raise