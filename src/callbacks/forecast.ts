import { findLocationById } from "../repository.ts";
import { newRetrospectiveForecastMessage } from "../retrospective.ts";
import { answerCallbackQuery, sendMessage, TelegramCallbackQuery } from "../telegram.ts";
import { CallbackContext } from "./callbackUsecase.ts";

const callbackDataKey = "forecast:";

const isForecastCallback = (callback: TelegramCallbackQuery) => callback.data?.includes(callbackDataKey) ?? false;

async function handleForecastCallback(ctx: CallbackContext) {
  if (!isForecastCallback(ctx.callback)) {
    throw new Error("no valid forecast callback");
  }

  const data = ctx.callback.data!;

  const [_prefix, when, locationId] = data.split(":");
  if (!locationId) {
    throw new Error("Unable to extract location name from callback_query");
  }

  if (when !== "now" && when !== "tomorrow") {
    throw new Error("Received funny callback data. It's neither today nor tomorrow.");
  }

  // To receive this kind of payload, the location must have been bookmarked.
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("received forecast:now callback for a location that doesn't exist");
  }

  const message = await newRetrospectiveForecastMessage(when, {
    coordinates: location.coordinates,
    name: location.name,
  });

  await answerCallbackQuery(ctx.callback, `Fetching weather for ${location.name}`);
  sendMessage(ctx.user.telegramId, message);
}

export default {
  isValid: isForecastCallback,
  handle: handleForecastCallback,
};
