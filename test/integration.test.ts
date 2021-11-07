import { superdeno } from "https://deno.land/x/superdeno@4.6.1/mod.ts";
import createApp from "../src/application.ts";
import { GeolocationClientMock } from "./mocks/GeolocationClientMock.ts";
import { WeatherClientMock } from "./mocks/WeatherClientMock.ts";

const app = await createApp({ geolocation: new GeolocationClientMock(), weather: new WeatherClientMock() });

// Stop from printing logs in test runner by setting level to critical.
app.state.logger.level = 50;

const server = () => superdeno(app.handle.bind(app));

// these values can be gathered in the docker-compose.yml
// for the tests to pass, run `make bootstrap`.
Deno.env.set("PGUSER", "root");
Deno.env.set("PGPASSWORD", "password");
Deno.env.set("PGDATABASE", "weatherbot_db");
Deno.env.set("PGHOST", "localhost");
Deno.env.set("PGPORT", "5431");

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

Deno.test("tomorrow command without params and no saved locations", async () => {
  const body = JSON.stringify(
    {
      "update_id": 897804178,
      "message": {
        "message_id": 1877,
        "from": from,
        "chat": chat,
        "date": 1636238095,
        "text": "/tomorrow",
        "entities": [
          {
            "offset": 0,
            "length": 9,
            "type": "bot_command",
          },
        ],
      },
    },
  );

  const responseBody = JSON.stringify({
    "method": "sendMessage",
    "chat_id": "123456",
    "text": "Which location do you want to check the weather for?",
    "parse_mode": "markdown",
    "reply_markup": { "inline_keyboard": [] },
  });

  await server()
    .post("/api/telegram")
    .set("Content-Type", "application/json")
    .send(body)
    .expect(200)
    .expect(responseBody);
});

Deno.test("tomorrow command with city/country params", async () => {
  const body = JSON.stringify(
    {
      "update_id": 897804178,
      "message": {
        "message_id": 1877,
        "from": from,
        "chat": chat,
        "date": 1636238095,
        "text": "/tomorrow madrid, es",
        "entities": [
          {
            "offset": 0,
            "length": 9,
            "type": "bot_command",
          },
        ],
      },
    },
  );

  await server()
    .post("/api/telegram")
    .set("Content-Type", "application/json")
    .send(body)
    .expect(200);
});

Deno.test("callback upon pressing forecast location button", async () => {
  const body = JSON.stringify(
    {
      "update_id": 897804179,
      "callback_query": {
        "id": "9882431251951838",
        "from": from,
        "message": {
          "message_id": 1878,
          "from": botFrom,
          "chat": chat,
          "date": 1636238098,
          "text": "Which location do you want to check the weather for?",
          "reply_markup": {
            "inline_keyboard": [
              [
                {
                  "text": "Madrid",
                  "callback_data": "forecast:tomorrow:5eb50979-2ce2-4266-8683-5a17a0d55496",
                },
              ],
            ],
          },
        },
        "chat_instance": "-6407614445290219374",
        "data": "forecast:tomorrow:5eb50979-2ce2-4266-8683-5a17a0d55496",
      },
    },
  );

  await server()
    .post("/api/telegram")
    .set("Content-Type", "application/json")
    .send(body)
    .expect(200);
});

// Canned data.
const botFrom = {
  "id": 409067584,
  "is_bot": true,
  "first_name": "WeatherWarnBot",
  "username": "WeatherWarnBot",
};

const from = {
  "id": 123456,
  "is_bot": false,
  "first_name": "John",
  "last_name": "Doe",
  "username": "jdoe",
  "language_code": "en",
};

const chat = {
  "id": 123456,
  "first_name": "John",
  "last_name": "Doe",
  "username": "jdoe",
  "type": "private",
};
