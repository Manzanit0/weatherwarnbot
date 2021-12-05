import { superdeno } from "https://deno.land/x/superdeno@4.6.1/mod.ts";
import { spy } from "https://deno.land/x/mock@0.10.1/spy.ts";

import createApp from "../src/application.ts";

import { GeolocationClientMock } from "./mocks/GeolocationClientMock.ts";
import { WeatherClientMock } from "./mocks/WeatherClientMock.ts";
import { TelegramClientMock } from "./mocks/TelegramClientMock.ts";

// TODO: Ideally we don't want to have these dependencies in the tests.
import { newClient } from "../src/repository/database.ts";
import { createUserLocation } from "../src/repository/locations.ts";
import { createUser } from "../src/repository/users.ts";
import { assertEquals } from "https://deno.land/std@0.113.0/testing/asserts.ts";
import { getLogger } from "../src/logger.ts";

const defaultApp = await createApp({
  geolocation: new GeolocationClientMock(),
  weather: new WeatherClientMock(),
  telegram: new TelegramClientMock(),
});

// Stop from printing logs in test runner by setting level to critical.
getLogger().level = 50;

const server = (app = defaultApp) => superdeno(app.handle.bind(app));

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
  await nukeDB();

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

Deno.test("tomorrow command without params and saved locations", async () => {
  await nukeDB();

  const user = await createUser({ ...from, telegramId: from.id + "" });
  const location = await createUserLocation({
    user_id: user.id,
    name: "Foo-land",
    coordinates: { latitude: 123, longitude: 456 },
  });

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
    "chat_id": `${from.id}`,
    "text": "Which location do you want to check the weather for?",
    "parse_mode": "markdown",
    "reply_markup": {
      "inline_keyboard": [[{
        "text": location.name,
        "callback_data": `forecast:tomorrow:${location.id}`,
      }]],
    },
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

Deno.test("tomorrow command with city/country params for saved location", async () => {
  await nukeDB();

  const user = await createUser({ ...from, telegramId: from.id + "" });
  const location = await createUserLocation({
    user_id: user.id,
    name: "Botany Bay",
    coordinates: { latitude: 123, longitude: 456 },
  });

  const body = JSON.stringify(
    {
      "update_id": 897804178,
      "message": {
        "message_id": 1877,
        "from": from,
        "chat": chat,
        "date": 1636238095,
        "text": "/tomorrow botany bay, au",
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

  const app = await createApp({
    geolocation: new GeolocationClientMock(),
    weather: new WeatherClientMock(),
    telegram: new TelegramClientMock(),
  });

  const expectedText = `🚩 Botany Bay
- - - - - - - - - - - - - - - - - - - - - -
📅 Sun Nov 07 2021 → Mon Nov 08 2021

TLDR:
🏷 cielo claro → cielo claro

Temperaturas:
📄 Suben un poco las temperaturas... pero no te dejes el abrigo en casa.
❄️ 4.87°C → 6.69°C
🔥 16.14ºC → 16.14ºC

Viento:
📄 Parece que va a haber una brisilla muy ligera, pero vamos, bien.
💨 2.28 m/s → 2.38 m/s

Humedad:
💧 47%
- - - - - - - - - - - - - - - - - - - - - -
`;

  // const expectedKeyboard = ;
  await server(app)
    .post("/api/telegram")
    .set("Content-Type", "application/json")
    .send(body)
    .expect(200)
    .expect({
      method: "sendMessage",
      chat_id: chat.id + "",
      text: expectedText,
      parse_mode: "markdown",
      reply_markup: {
        inline_keyboard: [
          [{ "text": "📬 Enable notifications", "callback_data": `location:notification_on:${location.id}` }],
        ],
      },
    });
});

Deno.test("callback upon pressing forecast location button for a location that doesn't exist", async () => {
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

  const expectedBody = JSON.stringify({
    "method": "sendMessage",
    "chat_id": `${from.id}`,
    "text": "Error: received forecast:now callback for a location that doesn't exist",
    "parse_mode": "markdown",
  });

  await server()
    .post("/api/telegram")
    .set("Content-Type", "application/json")
    .send(body)
    .expect(200)
    .expect(expectedBody);
});

Deno.test("callback upon pressing forecast location button for a valid location", async () => {
  await nukeDB();

  const user = await createUser({ ...from, telegramId: from.id + "" });
  const location = await createUserLocation({
    user_id: user.id,
    name: "Foo-land",
    coordinates: { latitude: 123, longitude: 456 },
  });

  const messageId = 1878;
  const body = JSON.stringify({
    "update_id": 897804179,
    "callback_query": {
      "id": "9882431251951838",
      "from": from,
      "message": {
        "message_id": messageId,
        "from": botFrom,
        "chat": chat,
        "date": 1636238098,
        "text": "Which location do you want to check the weather for?",
        "reply_markup": {
          "inline_keyboard": [
            [
              {
                "text": "Madrid",
                "callback_data": `forecast:tomorrow:${location.id}`,
              },
            ],
          ],
        },
      },
      "chat_instance": "-6407614445290219374",
      "data": `forecast:tomorrow:${location.id}`,
    },
  });

  const tgramMock = new TelegramClientMock();
  const updateMessageMock = spy(tgramMock, "updateMessage");

  const app = await createApp({
    geolocation: new GeolocationClientMock(),
    weather: new WeatherClientMock(),
    telegram: tgramMock,
  });

  await server(app)
    .post("/api/telegram")
    .set("Content-Type", "application/json")
    .send(body)
    .expect(200)
    .expect("");

  const expectedText = `🚩 Foo-land
- - - - - - - - - - - - - - - - - - - - - -
📅 Sun Nov 07 2021 → Mon Nov 08 2021

TLDR:
🏷 cielo claro → cielo claro

Temperaturas:
📄 Suben un poco las temperaturas... pero no te dejes el abrigo en casa.
❄️ 4.87°C → 6.69°C
🔥 16.14ºC → 16.14ºC

Viento:
📄 Parece que va a haber una brisilla muy ligera, pero vamos, bien.
💨 2.28 m/s → 2.38 m/s

Humedad:
💧 47%
- - - - - - - - - - - - - - - - - - - - - -
`;

  assertEquals(updateMessageMock.calls.length, 1);
  assertEquals(updateMessageMock.calls[0].args[0], messageId);
  assertEquals(updateMessageMock.calls[0].args[1].text, expectedText);
  assertEquals(updateMessageMock.calls[0].args[1].reply_markup, undefined);
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

// TODO: In order to avoid having to nuke the DB in each test, we need to push
// the repository to the boundary to replace it with a in-memory one.
const nukeDB = async () => {
  const c = newClient();
  await c.connect();
  await c.queryObject("DELETE FROM user_locations;");
  await c.queryObject("DELETE FROM users;");
  await c.end();
};
