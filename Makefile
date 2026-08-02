LOCAL_COMPOSE_FILE = docker-compose.local.yaml
LOG_SERVICE ?=
SERVICE ?=

# Docker Compose 실행
.PHONY: up-main
up-main:
	docker-compose -f $(LOCAL_COMPOSE_FILE) up -d frontend backend meilisearch postgres redis

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

# Docker Compose 중지 (볼륨까지 삭제 - 데이터 전부 사라짐)
downv:
	@read -p "볼륨까지 모두 삭제됩니다. 계속하시겠습니까? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose -f $(LOCAL_COMPOSE_FILE) down -v; \
	else \
		echo "취소되었습니다."; \
	fi

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

# Backend 테스트 실행 (sqlite in-memory DB 사용, 운영 DB에는 영향 없음)
test:
	docker exec -it notemd-backend python3 manage.py test ${TEST_ARGS}

.PHONY: db-history
db-history:
	docker exec -it notemd-backend alembic history

.PHONY: backfill
backfill:
	docker exec -it notemd-backend python3 -m scripts.$(SCRIPT) $(ARGS)

.PHONY: add_module
add_module:
	@read -p "모듈 이름을 입력하세요: " module_name; \
	if [ -z "$$module_name" ]; then \
		echo "모듈 이름이 입력되지 않았습니다. 취소합니다."; \
	else \
		docker exec -it notemd-backend python3 manage.py add_module $$module_name; \
	fi


.PHONY: build upd up up-build  down logs migrate makemigrations ps test
