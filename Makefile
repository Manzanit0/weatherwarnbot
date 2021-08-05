run:
	deno run --allow-net --allow-env src/index.ts

test:
	deno test

test-watch:
	deno test --watch

database-bootstrap:
	docker compose up --build

database-teardown:
	docker-compose -f docker-compose.yml down --volumes

