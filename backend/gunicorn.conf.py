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
