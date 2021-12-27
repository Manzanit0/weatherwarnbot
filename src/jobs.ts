import { Cron } from "https://deno.land/x/crontab@0.1.1-1/cron.ts";

import notifyWeatherChanges from "./jobs/notifyWeatherChanges.ts";
import { openWeatherMapClient } from "./openweathermap.ts";
import { telegramClient } from "./telegram/client.ts";
import { newForecastClient } from "./forecast.ts";

const cron = new Cron();

// Every day at 08.00 UTC.
cron.add("00 08 * * *", async () => {
  const fc = newForecastClient(openWeatherMapClient);
  await notifyWeatherChanges(telegramClient, fc);
});

export const startJobs = () => cron.start();
