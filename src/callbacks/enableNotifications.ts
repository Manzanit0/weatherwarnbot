import { getLogger } from "../logger.ts";
import { AuthenticatedContext } from "../middleware.ts";
import { createUserLocation, enableNotifications, findLocationById, UserLocation } from "../repository/locations.ts";
import { TelegramCallbackQuery } from "../telegram/types.ts";
import { response, withInlineKeyboard } from "../telegram/utils.ts";
import { v4 } from "https://deno.land/std@0.116.0/uuid/mod.ts";

const callbackDataKey = "location:notification_on";

const isEnableNotificationsCallback = (callback: TelegramCallbackQuery) =>
  callback.data?.includes(callbackDataKey) ?? false;

async function handleEnableNotificationsCallback(ctx: AuthenticatedContext, callback: TelegramCallbackQuery) {
  if (!isEnableNotificationsCallback(callback)) {
    throw new Error("is not enable notifications payload");
  }

  const logger = getLogger();

  const [_, locationIdOrName] = callback.data!.split(callbackDataKey + ":");

  let location: UserLocation | null = null;
  if (v4.validate(locationIdOrName)) {
    location = await findLocationById(locationIdOrName);
  }

  // If it's not an UUID or we didn't find one, just bookmark it and enable notifications.
  if (!location) {
    const geolocation = await ctx.geolocationClient.findLocation(locationIdOrName);
    if (!geolocation) {
      throw new Error("unable to geolocate location");
    }

    location = await createUserLocation({
      user_id: ctx.user.id,
      name: geolocation.name,
      coordinates: {
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
      },
      positionstack: geolocation,
    });
  }

  const count = await enableNotifications(location.id);
  if (count === 0) {
    throw new Error("no location found for id " + location.id);
  } else if (count < 1) {
    // TODO: use transactions and rollback if this happens
    logger.warning(`${count} locations updated for id ${location.id}, but it should have been 1`);
  }

  const originalMessageId = callback.message.message_id;
  const originalMessageText = callback.message.text;
  const payload = withInlineKeyboard(response(ctx.user.telegramId, originalMessageText), []);

  await ctx.telegramClient.updateMessage(originalMessageId, payload);
  await ctx.telegramClient.answerCallbackQuery(callback, "Notifications enabled!");
}

// complies with CallbackUsecase interface
export default {
  handle: handleEnableNotificationsCallback,
  isValid: isEnableNotificationsCallback,
};
