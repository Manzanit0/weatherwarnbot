import { Forecast, ForecastClient } from "../forecast.ts";
import { getLogger } from "../logger.ts";
import { retrospectiveMessage } from "../messages.ts";
import { listLocationsToAlert, UserLocation } from "../repository/locations.ts";
import { TelegramClient } from "../telegram/client.ts";

export default async (t: TelegramClient, w: ForecastClient) => {
  const results: Promise<void>[] = [];

  // FIXME: based on the query, there's a chance we'll be messaging the same
  // user multiple times. We might want to group all the locations by user?
  for (const location of await listLocationsToAlert()) {
    results.push(apply(t, w, location));
  }

  for (const result of results) {
    try {
      await result;
    } catch (error) {
      getLogger().error(JSON.stringify(error));
    }
  }
};

const apply = async (t: TelegramClient, f: ForecastClient, x: UserLocation) => {
  const daily = f.fetchWeatherByCoordinates(x.coordinates.latitude, x.coordinates.longitude);
  const historic = f.fetchYesterdayWeatherByCoordinates(x.coordinates.latitude, x.coordinates.longitude);
  const [dailyResolved, historicResolved] = await Promise.all([daily, historic]);

  if (isTemperatureDecreasing(dailyResolved, historicResolved)) {
    let message = retrospectiveMessage(historicResolved, dailyResolved);
    message = `Hey! the temperature is dropping today ❄️...

    ${message}`;

    return t.sendMessage(x.user!.telegramId, message);
  }

  if (isTemperatureIncreasing(dailyResolved, historicResolved)) {
    let message = retrospectiveMessage(historicResolved, dailyResolved);
    message = `Hey! the temperature is increasing today 🔥...

    ${message}`;

    return t.sendMessage(x.user!.telegramId, message);
  }

  if (isConditionChanging(dailyResolved, historicResolved)) {
    let message = retrospectiveMessage(historicResolved, dailyResolved);
    message = `Hey! apparently the weather is changing today ⛅️...

    ${message}`;

    return t.sendMessage(x.user!.telegramId, message);
  }

  return Promise.resolve();
};

const isTemperatureDecreasing = (today: Forecast, yesterday: Forecast) =>
  (today.maxTemperature - yesterday.maxTemperature) < -4;

const isTemperatureIncreasing = (today: Forecast, yesterday: Forecast) =>
  (today.maxTemperature - yesterday.maxTemperature) > 4;

const isConditionChanging = (today: Forecast, yesterday: Forecast) => {
  const eitherItStartsToRainOrStops =
    (today.description.toLowerCase().includes("lluvia") && !yesterday.description.toLowerCase().includes("lluvia")) ||
    (today.description.toLowerCase().includes("rain") && !yesterday.description.toLowerCase().includes("rain"));

  const eitherTheresAStormOrItStops = (today.description.toLowerCase().includes("tormenta") &&
    !yesterday.description.toLowerCase().includes("tormenta")) ||
    (today.description.toLowerCase().includes("storm") && !yesterday.description.toLowerCase().includes("storm"));

  return eitherItStartsToRainOrStops || eitherTheresAStormOrItStops;
};
