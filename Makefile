COMPOSE_BASE := deployments/docker-compose/docker-compose.yaml
COMPOSE_DEV_RDS_TROUBLESHOOTING := deployments/docker-compose/docker-compose.dev-rds.troubleshooting.yaml
COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD := docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV_RDS_TROUBLESHOOTING)

BACKEND_SERVICES := identity flight passenger booking payment

.PHONY: up-dev-rds-troubleshooting down-dev-rds-troubleshooting cutover-dev-rds-troubleshooting restart-dev-rds-identity restart-dev-rds-payment stop-local-postgres rm-local-postgres ps-dev-rds-troubleshooting verify-dev-rds-env logs-dev-rds-troubleshooting rebuild-frontend wallet-proxy-smoke

up-dev-rds-troubleshooting:
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) up -d rabbitmq redis otel-collector
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) up -d --no-deps $(BACKEND_SERVICES)
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) up -d --no-deps frontend

down-dev-rds-troubleshooting:
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) down --remove-orphans

stop-local-postgres:
	docker compose -f $(COMPOSE_BASE) stop postgres || true

rm-local-postgres:
	docker compose -f $(COMPOSE_BASE) rm -f postgres || true

cutover-dev-rds-troubleshooting: stop-local-postgres rm-local-postgres up-dev-rds-troubleshooting

restart-dev-rds-identity:
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) restart identity

restart-dev-rds-payment:
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) restart payment

ps-dev-rds-troubleshooting:
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) ps

verify-dev-rds-env:
	@docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' identity | grep -E '^(POSTGRES_HOST|POSTGRES_Database)=' | paste -sd' ' - | sed 's/^/identity:/'
	@docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' flight | grep -E '^(POSTGRES_HOST|POSTGRES_Database)=' | paste -sd' ' - | sed 's/^/flight:/'
	@docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' passenger | grep -E '^(POSTGRES_HOST|POSTGRES_Database)=' | paste -sd' ' - | sed 's/^/passenger:/'
	@docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' booking | grep -E '^(POSTGRES_HOST|POSTGRES_Database)=' | paste -sd' ' - | sed 's/^/booking:/'
	@docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' payment | grep -E '^(POSTGRES_HOST|POSTGRES_Database)=' | paste -sd' ' - | sed 's/^/payment:/'

logs-dev-rds-troubleshooting:
	$(COMPOSE_DEV_RDS_TROUBLESHOOTING_CMD) logs --tail=150 $(BACKEND_SERVICES) frontend

rebuild-frontend:
	docker compose -f $(COMPOSE_BASE) build --no-cache frontend
	docker compose -f $(COMPOSE_BASE) up -d --no-deps frontend
	docker compose -f $(COMPOSE_BASE) exec -T frontend sh -lc "grep -n '/api/v1/wallet' /etc/nginx/conf.d/default.conf"

wallet-proxy-smoke:
	bash deployments/docker-compose/scripts/wallet-proxy-smoke.sh
