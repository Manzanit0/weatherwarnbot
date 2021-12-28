import { cron, start } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";

import notifyWeatherChanges from "./jobs/notifyWeatherChanges.ts";
import { openWeatherMapClient } from "./openweathermap.ts";
import { telegramClient } from "./telegram/client.ts";
import { newForecastClient } from "./forecast.ts";

// Every day at 07.00 UTC.
cron("00 07 * * *", async () => {
  const fc = newForecastClient(openWeatherMapClient);
  await notifyWeatherChanges(telegramClient, fc);
});

export const startJobs = () => start();
