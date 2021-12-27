import { ForecastClient } from "../forecast.ts";
import { getLogger } from "../logger.ts";
import { retrospectiveMessage } from "../messages.ts";
import { listLocationsToAlert, UserLocation } from "../repository/locations.ts";
import { TelegramClient } from "../telegram/client.ts";

export default async (t: TelegramClient, w: ForecastClient) => {
  // FIXME: based on the query, there's a chance we'll be messaging the same
  // user multiple times. We might want to group all the locations by user?
  for (const location of await listLocationsToAlert()) {
    // Isolate the attempt for each location.
    try {
      getLogger().info("processing " + location.name);
      // TODO: this will be a bottleneck. Would be nice to not block per
      // message. Look into how to solve this with Deno.
      await apply(t, w, location);
    } catch (error) {
      getLogger().error(JSON.stringify(error));
    }
  }
};

const apply = async (t: TelegramClient, f: ForecastClient, x: UserLocation) => {
  const daily = f.fetchWeatherByCoordinates(x.coordinates.latitude, x.coordinates.longitude);
  const historic = f.fetchYesterdayWeatherByCoordinates(x.coordinates.latitude, x.coordinates.longitude);
  const [dailyResolved, historicResolved] = await Promise.all([daily, historic]);

  if (
    (Math.abs(dailyResolved.minimumTemperature - historicResolved.minimumTemperature) > 5) || // 5º diff
    (Math.abs(dailyResolved.maxTemperature - historicResolved.maxTemperature) > 5) || // 5º diff
    (dailyResolved.description !== historicResolved.description) // Something changes. Maybe clouds, maybe something else.
  ) {
    let message = retrospectiveMessage(historicResolved, dailyResolved);
    message = `Hey! Apparently the weather is changing...

    ${message}`;

    return t.sendMessage(x.user!.telegramId, message);
  }

  return Promise.resolve();
};
