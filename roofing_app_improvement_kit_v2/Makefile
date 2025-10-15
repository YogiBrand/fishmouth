SHELL:=/bin/bash

up:
	docker compose -f docker-compose.yml -f config/docker-compose.additions.yml -f config/docker-compose.tiles.yml up -d

down:
	docker compose -f docker-compose.yml -f config/docker-compose.additions.yml -f config/docker-compose.tiles.yml down

health:
	bash scripts/ops/healthcheck.sh
