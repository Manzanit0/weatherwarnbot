import { AuthenticatedContext } from "../middleware.ts";
import { createUserLocation, findLocationByNameAndUser } from "../repository.ts";
import {
  answerCallbackQuery,
  enableNotificationsInlineButton,
  response,
  TelegramRequestBody,
  updateMessage,
  withInlineKeyboard,
} from "../telegram.ts";

const callbackDataKey = "location:bookmark";

const isBookmarkLocationCallback = (body: TelegramRequestBody) =>
  body.callback_query?.data.includes(callbackDataKey) ?? false;

async function handleBookmarkLocationCallback(ctx: AuthenticatedContext) {
  if (!isBookmarkLocationCallback(ctx.payload)) {
    throw new Error("is not bookmark location payload");
  }

  const [_, locationName] = ctx.payload.callback_query!.data.split(callbackDataKey + ":");
  const [city, _countryCode] = locationName.split(",");

  const location = await findLocationByNameAndUser(city, ctx.user.id);
  if (location) {
    await answerCallbackQuery(ctx.payload, "Location already bookmarked!");
    return;
  }

  const geolocation = await ctx.geolocationClient.findLocation(city);
  if (!geolocation) {
    await answerCallbackQuery(ctx.payload, "Unable to geolocate location by name");
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

  const originalMessageId = ctx.payload.callback_query!.message.message_id;
  const originalMessageText = ctx.payload.callback_query!.message.text;
  const payload = withInlineKeyboard(response(ctx.user.telegramId, originalMessageText), [[
    enableNotificationsInlineButton,
  ]]);

  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.payload, "Location bookmarked!");
}

// complies with CallbackUsecase interface
export default {
  handle: handleBookmarkLocationCallback,
  isValid: isBookmarkLocationCallback,
};
