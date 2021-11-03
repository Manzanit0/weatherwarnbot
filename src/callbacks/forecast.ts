import { buildForecastMessage, Day, fetchWeatherByCoordinates } from "../forecast.ts";
import { AuthenticatedContext } from "../middleware.ts";
import { findLocationById } from "../repository.ts";
import { answerCallbackQuery, sendMessage, TelegramRequestBody } from "../telegram.ts";

const callbackDataKey = "forecast:";

const isForecastCallback = (body: TelegramRequestBody) => body.callback_query?.data.includes(callbackDataKey) ?? false;

async function handleForecastCallback(ctx: AuthenticatedContext) {
  if (!isForecastCallback(ctx.payload)) {
    throw new Error("no valid forecast callback");
  }

  const data = ctx.payload.callback_query!.data;

  const locationId = data.split(":")[2];
  if (!locationId) {
    throw new Error("Unable to extract location name from callback_query");
  }

  // To receive this kind of payload, the location must have been bookmarked.
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("received forecast:now callback for a location that doesn't exist");
  }

  const forecastDay = data.includes("forecast:tomorrow") ? Day.TOMORROW : Day.TODAY;
  const forecast = await fetchWeatherByCoordinates(
    location.coordinates.latitude,
    location.coordinates.longitude,
    forecastDay,
  );

  await answerCallbackQuery(ctx.payload, `Fetching weather for ${location.name || "location"}`);
  const message = buildForecastMessage({ ...forecast, location: location.name! });
  sendMessage(ctx.user.telegram_chat_id, message);
}

export default {
  isValid: isForecastCallback,
  handle: handleForecastCallback,
};
