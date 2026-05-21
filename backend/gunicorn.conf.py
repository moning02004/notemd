bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
loglevel = "info"

# hot reload 설정
reload = True
reload_extra_files = [
    "app/",  # app 폴더 전체 감지
]

# 추가
accesslog = "-"   # stdout으로 액세스 로그
errorlog = "-"    # stdout으로 에러 로그
worker_tmp_dir = "/dev/shm"  # 워커 로그 안정성
