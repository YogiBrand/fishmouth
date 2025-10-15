SHELL:=/bin/bash
COMPOSE_FILES:=docker-compose.yml config/docker-compose.additions.yml config/docker-compose.tiles.yml observability/docker-compose.observability.yml

up:
	docker compose $(addprefix -f ,$(COMPOSE_FILES)) up -d

down:
	docker compose $(addprefix -f ,$(COMPOSE_FILES)) down

health:
	bash scripts/ops/healthcheck.sh
