import { superdeno } from "https://deno.land/x/superdeno@4.6.1/mod.ts";
import app from "../src/application.ts";

// Stop from printing logs in test runner by setting level to critical.
app.state.logger.level = 50;

const server = () => superdeno(app.handle.bind(app));

Deno.test("serve Hello World", async () => {
  await server()
    .get("/")
    .expect(200);
});

Deno.test("the webhook only allows telegram-format requests", async () => {
  await server()
    .post("/api/telegram")
    .set("Content-Type", "application/json")
    .send('{"name":"superoak"}')
    .expect(400);
});
