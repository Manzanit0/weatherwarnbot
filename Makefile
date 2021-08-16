run:
	deno run --allow-net --allow-env src/index.ts

test:
	deno test

test-watch:
	deno test --watch

bootstrap:
	docker compose up --build

bootstrap-down:
	docker-compose -f docker-compose.yml down --volumes

set-telegram-webhook:
	curl -X POST https://api.telegram.org/bot$(TELEGRAM_BOT_TOKEN)/setWebhook?url=$(APP_HOST)/api/telegram
