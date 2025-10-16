SHELL:=/bin/bash

export $(shell sed -n 's/^\([^#][^=]*\)=.*//p' .env 2>/dev/null)

.PHONY: up tiles admin-ui build-admin seed e2e health

up:
	docker compose -f app/docker-compose.yml -f app/config/docker-compose.additions.yml up -d --build

tiles:
	docker compose -f app/docker-compose.yml -f app/config/docker-compose.tiles.yml up -d tileserver_gl titiler

admin-ui:
	cd app/admin-ui && docker build --build-arg VITE_ADMIN_API=$${VITE_ADMIN_API:-http://localhost:8031} -t fishmouth/admin-ui:local . && docker run -d -p 3031:3031 --name admin-ui fishmouth/admin-ui:local

seed:
	python3 scripts/e2e/seed_demo_data.py

e2e:
	bash scripts/e2e/smoke.sh

health:
	bash app/scripts/ops/healthcheck.sh 2>/dev/null || echo 'healthcheck script missing in this repo'