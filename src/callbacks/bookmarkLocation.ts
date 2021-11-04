import { createUserLocation, findLocationByNameAndUser } from "../repository.ts";
import {
  answerCallbackQuery,
  enableNotificationsInlineButton,
  response,
  TelegramCallbackQuery,
  updateMessage,
  withInlineKeyboard,
} from "../telegram.ts";
import { CallbackContext } from "./callbackUsecase.ts";

const callbackDataKey = "location:bookmark";

const isBookmarkLocationCallback = (callback: TelegramCallbackQuery) =>
  callback.data?.includes(callbackDataKey) ?? false;

async function handleBookmarkLocationCallback(ctx: CallbackContext) {
  if (!isBookmarkLocationCallback(ctx.callback)) {
    throw new Error("is not bookmark location payload");
  }

  const [_, locationName] = ctx.callback.data!.split(callbackDataKey + ":");
  const [city, _countryCode] = locationName.split(",");

  const location = await findLocationByNameAndUser(city, ctx.user.id);
  if (location) {
    await answerCallbackQuery(ctx.callback, "Location already bookmarked!");
    return;
  }

  const geolocation = await ctx.geolocationClient.findLocation(city);
  if (!geolocation) {
    await answerCallbackQuery(ctx.callback, "Unable to geolocate location by name");
    return;
  }

  ctx.logger.info(`found location ${geolocation.name} through PositionStack`);

  const _location = await createUserLocation({
    user_id: ctx.user.id,
    name: geolocation.name,
    coordinates: {
      latitude: geolocation.latitude,
      longitude: geolocation.longitude,
    },
    positionstack: geolocation,
  });

  const originalMessageId = ctx.callback.message.message_id;
  const originalMessageText = ctx.callback.message.text;
  const payload = withInlineKeyboard(response(ctx.user.telegramId, originalMessageText), [[
    enableNotificationsInlineButton,
  ]]);

  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.callback, "Location bookmarked!");
}

// complies with CallbackUsecase interface
export default {
  handle: handleBookmarkLocationCallback,
  isValid: isBookmarkLocationCallback,
};
