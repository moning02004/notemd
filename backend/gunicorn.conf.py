bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
loglevel = "info"
# 운영용 설정(Dockerfile)이라 reload 미사용. 로컬 개발은 Dockerfile.local 의
# `uvicorn --reload` 를 사용.
reload = False

# 추가
accesslog = "-"   # stdout으로 액세스 로그
errorlog = "-"    # stdout으로 에러 로그
worker_tmp_dir = "/dev/shm"  # 워커 로그 안정성
