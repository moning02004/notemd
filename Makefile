LOCAL_COMPOSE_FILE = docker-compose.local.yaml

# Docker Compose 실행
up:
	docker-compose -f $(LOCAL_COMPOSE_FILE) up -d

# Docker Compose 실행
up-build:
	docker-compose -f $(LOCAL_COMPOSE_FILE) up -d --build

# Docker Compose 중지
down:
	docker-compose -f $(LOCAL_COMPOSE_FILE) down

# 로그 확인
logs:
	docker-compose -f $(LOCAL_COMPOSE_FILE) logs -f

# Docker Compose db migrate
makemigrations:
	docker exec -it notemd-backend python3 manage.py makemigrations

migrate:
	docker exec -it notemd-backend python3 manage.py migrate

.PHONY: build up up-build  down logs migrate makemigrations
