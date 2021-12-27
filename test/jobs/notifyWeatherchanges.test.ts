import { resolvesNext, returnsNext, stub } from "https://deno.land/x/mock@0.12.1/mod.ts";

import notifyWeatherChanges from "../../src/jobs/notifyWeatherChanges.ts";
import { createUserLocation, enableNotifications } from "../../src/repository/locations.ts";
import { createUser } from "../../src/repository/users.ts";
import { newForecastClient } from "../../src/forecast.ts";

import { setup } from "../helpers.ts";
import { WeatherClientMock } from "../mocks/WeatherClientMock.ts";
import { TelegramClientMock } from "../mocks/TelegramClientMock.ts";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.113.0/testing/asserts.ts";

Deno.test("a message is sent if max temperature is more than 5ºC", async () => {
  const { user } = await before();

  const location = await createUserLocation({
    user_id: user.id,
    name: "Foo-land",
    coordinates: { latitude: 123, longitude: 456 },
  });

  await enableNotifications(location.id);

  const tMock = new TelegramClientMock();
  const sendMessageSpy = stub(tMock, "sendMessage", returnsNext([Promise.resolve()]));

  const fMock = newForecastClient(new WeatherClientMock());

  stub(
    fMock,
    "fetchWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: " (N/a)",
      description: "cielo claro",
      minimumTemperature: 4.87,
      maxTemperature: 30.00,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  stub(
    fMock,
    "fetchYesterdayWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: " (N/a)",
      description: "cielo claro",
      minimumTemperature: 4.87,
      maxTemperature: 24.9,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  // Act
  await notifyWeatherChanges(tMock, fMock);

  assertEquals(sendMessageSpy.calls.length, 1);
  assertEquals(sendMessageSpy.calls[0].args[0], user.telegramId);
  assertStringIncludes(sendMessageSpy.calls[0].args[1], "Hey! Apparently the weather is changing...");
});

Deno.test("a message is sent if description changes", async () => {
  const { user } = await before();

  const location = await createUserLocation({
    user_id: user.id,
    name: "Foo-land",
    coordinates: { latitude: 123, longitude: 456 },
  });

  await enableNotifications(location.id);

  const tMock = new TelegramClientMock();
  const sendMessageSpy = stub(tMock, "sendMessage", returnsNext([Promise.resolve()]));

  const fMock = newForecastClient(new WeatherClientMock());

  stub(
    fMock,
    "fetchWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: " (N/a)",
      description: "cielo claro",
      minimumTemperature: 4.87,
      maxTemperature: 30.00,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  stub(
    fMock,
    "fetchYesterdayWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: " (N/a)",
      description: "nubes",
      minimumTemperature: 4.87,
      maxTemperature: 30.0,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  // Act
  await notifyWeatherChanges(tMock, fMock);

  assertEquals(sendMessageSpy.calls.length, 1);
  assertEquals(sendMessageSpy.calls[0].args[0], user.telegramId);
  assertStringIncludes(sendMessageSpy.calls[0].args[1], "Hey! Apparently the weather is changing...");
});

Deno.test("no message is sent if weather is mildly the same", async () => {
  const { user } = await before();

  const location = await createUserLocation({
    user_id: user.id,
    name: "Foo-land",
    coordinates: { latitude: 123, longitude: 456 },
  });

  await enableNotifications(location.id);

  const tMock = new TelegramClientMock();
  const sendMessageSpy = stub(tMock, "sendMessage", returnsNext([Promise.resolve()]));

  const fMock = newForecastClient(new WeatherClientMock());

  stub(
    fMock,
    "fetchWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: " (N/a)",
      description: "nubes",
      minimumTemperature: 4.87,
      maxTemperature: 30.00,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  stub(
    fMock,
    "fetchYesterdayWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: " (N/a)",
      description: "nubes",
      minimumTemperature: 4.87,
      maxTemperature: 25.5,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  // Act
  await notifyWeatherChanges(tMock, fMock);

  assertEquals(sendMessageSpy.calls.length, 0);
});

Deno.test("a message is sent per location", async () => {
  const { user } = await before();

  const location = await createUserLocation({
    user_id: user.id,
    name: "Foo-land-1",
    coordinates: { latitude: 123, longitude: 456 },
  });

  const locationTwo = await createUserLocation({
    user_id: user.id,
    name: "Foo-land-2",
    coordinates: { latitude: 123, longitude: 956 },
  });

  await enableNotifications(location.id);
  await enableNotifications(locationTwo.id);

  const tMock = new TelegramClientMock();
  const sendMessageSpy = stub(tMock, "sendMessage", returnsNext([Promise.resolve()]));

  const fMock = newForecastClient(new WeatherClientMock());

  stub(
    fMock,
    "fetchWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: "Foo-Land-1",
      description: "cielo claro",
      minimumTemperature: 4.87,
      maxTemperature: 30.00,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }, {
      isClear: true,
      location: "Foo-Land-2",
      description: "cielo claro",
      minimumTemperature: 4.87,
      maxTemperature: 30.00,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  stub(
    fMock,
    "fetchYesterdayWeatherByCoordinates",
    resolvesNext([{
      isClear: true,
      location: "Foo-Land-1",
      description: "cielo claro",
      minimumTemperature: 4.87,
      maxTemperature: 24.9,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }, {
      isClear: true,
      location: "Foo-Land-2",
      description: "cielo claro",
      minimumTemperature: 4.87,
      maxTemperature: 24.9,
      humidity: 47,
      windSpeed: 2.28,
      dateUnixTimestamp: 1636282800,
    }]),
  );

  // Act
  await notifyWeatherChanges(tMock, fMock);

  // Two messages are sent
  assertEquals(sendMessageSpy.calls.length, 2);

  // Both messages are sent to the same user
  assertEquals(sendMessageSpy.calls[0].args[0], user.telegramId);
  assertEquals(sendMessageSpy.calls[1].args[0], user.telegramId);

  // The first message is regarding the first location
  assertStringIncludes(sendMessageSpy.calls[0].args[1], "Hey! Apparently the weather is changing...");
  assertStringIncludes(sendMessageSpy.calls[0].args[1], "Foo-Land-1");

  // The second message is regarding the second location
  assertStringIncludes(sendMessageSpy.calls[1].args[1], "Hey! Apparently the weather is changing...");
  assertStringIncludes(sendMessageSpy.calls[1].args[1], "Foo-Land-2");
});

const before = async () => {
  await setup();

  const user = await createUser({
    "is_bot": false,
    "first_name": "John",
    "last_name": "Doe",
    "username": "jdoe",
    "language_code": "en",
    "telegramId": "123456",
  });

  return { user };
};
