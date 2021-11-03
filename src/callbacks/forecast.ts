import {
  buildRetrospectiveForecastMessage,
  Day,
  fetchWeatherByCoordinates,
  fetchYesterdayWeatherByCoordinates,
  Forecast,
} from "../forecast.ts";
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

  const [_prefix, when, locationId] = data.split(":");
  if (!locationId) {
    throw new Error("Unable to extract location name from callback_query");
  }

  // To receive this kind of payload, the location must have been bookmarked.
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("received forecast:now callback for a location that doesn't exist");
  }

  let previous: Forecast, requested: Forecast;
  switch (when) {
    case "tomorrow": {
      requested = await fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TOMORROW,
      );

      previous = await fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TODAY,
      );

      break;
    }
    case "today": {
      requested = await fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TODAY,
      );

      previous = await fetchYesterdayWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
      );

      break;
    }

    default:
      throw new Error(":_)");
  }

  await answerCallbackQuery(ctx.payload, `Fetching weather for ${location.name || "location"}`);
  const message = buildRetrospectiveForecastMessage(
    { ...previous, location: location.name! },
    { ...requested, location: location.name! },
  );
  sendMessage(ctx.user.telegram_chat_id, message);
}

export default {
  isValid: isForecastCallback,
  handle: handleForecastCallback,
};
