from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_is_true():
    assert 1 == 1
