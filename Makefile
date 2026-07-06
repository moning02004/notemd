LOCAL_COMPOSE_FILE = docker-compose.local.yaml
LOG_SERVICE ?=
SERVICE ?=

# Docker Compose 실행
up:
	docker-compose -f $(LOCAL_COMPOSE_FILE) up -d --remove-orphans

upa:
	docker-compose -f $(LOCAL_COMPOSE_FILE) up $(SERVICE)

# Docker Compose 실행
up-build:
	docker compose -f $(LOCAL_COMPOSE_FILE) build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8002 frontend
	docker compose -f $(LOCAL_COMPOSE_FILE) build backend
	docker compose -f $(LOCAL_COMPOSE_FILE) up -d

# Docker Compose 중지
down:
	docker-compose -f $(LOCAL_COMPOSE_FILE) down

# Docker Compose 중지
downv:
	docker-compose -f $(LOCAL_COMPOSE_FILE) down -v

# 로그 확인
logs:
	docker-compose -f $(LOCAL_COMPOSE_FILE) logs $(LOG_SERVICE) -f

# Docker Compose db migrate
makemigrations:
	docker exec -it notemd-backend python3 manage.py makemigrations

migrate:
	docker exec -it notemd-backend python3 manage.py migrate

ps:
	docker-compose -f $(LOCAL_COMPOSE_FILE) ps -a


restart:
	docker-compose -f $(LOCAL_COMPOSE_FILE) restart backend


.PHONY: build upd up up-build  down logs migrate makemigrations ps
