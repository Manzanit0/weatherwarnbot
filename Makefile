run: bootstrap
	deno run --allow-net --allow-env src/index.ts

test: bootstrap
	deno test -A --fail-fast

bootstrap:
	docker compose up --build -d

bootstrap-down:
	docker-compose -f docker-compose.yml down --volumes

set-telegram-webhook:
	curl -X POST https://api.telegram.org/bot$(TELEGRAM_BOT_TOKEN)/setWebhook?url=$(APP_HOST)/api/telegram


# railway.app specific targets
rw-migrate:
	docker run --rm -v `pwd`/migrations:/flyway/sql flyway/flyway:7.14.0 \
	-url=jdbc:postgresql://`railway variables get PGHOST`:`railway variables get PGPORT`/`railway variables get PGDATABASE` \
	-user=`railway variables get PGUSER` \
	-password=`railway variables get PGPASSWORD` \
	-schemas=public \
	-connectRetries=60 \
	migrate

rw-pgcli:
	pgcli `railway variables get DATABASE_URL`
