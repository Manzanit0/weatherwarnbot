import { AuthenticatedContext } from "../middleware.ts";
import { createUserLocation, findLocationByNameAndUser } from "../repository.ts";
import { TelegramCallbackQuery } from "../telegram/types.ts";
import { enableNotificationsInlineButton, response, withInlineKeyboard } from "../telegram/utils.ts";

const callbackDataKey = "location:bookmark";

const isBookmarkLocationCallback = (callback: TelegramCallbackQuery) =>
  callback.data?.includes(callbackDataKey) ?? false;

async function handleBookmarkLocationCallback(ctx: AuthenticatedContext, callback: TelegramCallbackQuery) {
  if (!isBookmarkLocationCallback(callback)) {
    throw new Error("is not bookmark location payload");
  }

  const [_, locationName] = callback.data!.split(callbackDataKey + ":");
  const [city, _countryCode] = locationName.split(",");

  const location = await findLocationByNameAndUser(city, ctx.user.id);
  if (location) {
    await ctx.telegramClient.answerCallbackQuery(callback, "Location already bookmarked!");
    return;
  }

  const geolocation = await ctx.geolocationClient.findLocation(city);
  if (!geolocation) {
    await ctx.telegramClient.answerCallbackQuery(callback, "Unable to geolocate location by name");
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

  const originalMessageId = callback.message.message_id;
  const originalMessageText = callback.message.text;
  const payload = withInlineKeyboard(response(ctx.user.telegramId, originalMessageText), [[
    enableNotificationsInlineButton,
  ]]);

  await ctx.telegramClient.updateMessage(originalMessageId, payload);
  await ctx.telegramClient.answerCallbackQuery(callback, "Location bookmarked!");
}

// complies with CallbackUsecase interface
export default {
  handle: handleBookmarkLocationCallback,
  isValid: isBookmarkLocationCallback,
};
