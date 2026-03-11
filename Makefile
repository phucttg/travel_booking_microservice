COMPOSE_BASE := deployments/docker-compose/docker-compose.yaml
COMPOSE_RDS := deployments/docker-compose/docker-compose.rds.yaml
COMPOSE_RDS_CMD := docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_RDS)

BACKEND_SERVICES := identity flight passenger booking

.PHONY: up-rds down-rds cutover-rds restart-identity-rds stop-local-postgres rm-local-postgres ps-rds verify-rds-env logs-rds

up-rds:
	$(COMPOSE_RDS_CMD) up -d rabbitmq
	$(COMPOSE_RDS_CMD) up -d --no-deps $(BACKEND_SERVICES)
	$(COMPOSE_RDS_CMD) up -d --no-deps frontend

down-rds:
	$(COMPOSE_RDS_CMD) down --remove-orphans

stop-local-postgres:
	docker compose -f $(COMPOSE_BASE) stop postgres || true

rm-local-postgres:
	docker compose -f $(COMPOSE_BASE) rm -f postgres || true

cutover-rds: stop-local-postgres rm-local-postgres up-rds

restart-identity-rds:
	$(COMPOSE_RDS_CMD) restart identity

ps-rds:
	$(COMPOSE_RDS_CMD) ps

verify-rds-env:
	$(COMPOSE_RDS_CMD) exec -T identity sh -lc 'echo identity:$${POSTGRES_HOST}/$${POSTGRES_Database}'
	$(COMPOSE_RDS_CMD) exec -T flight sh -lc 'echo flight:$${POSTGRES_HOST}/$${POSTGRES_Database}'
	$(COMPOSE_RDS_CMD) exec -T passenger sh -lc 'echo passenger:$${POSTGRES_HOST}/$${POSTGRES_Database}'
	$(COMPOSE_RDS_CMD) exec -T booking sh -lc 'echo booking:$${POSTGRES_HOST}/$${POSTGRES_Database}'

logs-rds:
	$(COMPOSE_RDS_CMD) logs --tail=150 $(BACKEND_SERVICES) frontend
