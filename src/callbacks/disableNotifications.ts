import { AuthenticatedContext } from "../middleware.ts";
import { disableNotifications, findLocationById, UserLocation } from "../repository/locations.ts";
import { TelegramCallbackQuery } from "../telegram/types.ts";
import { response, withInlineKeyboard } from "../telegram/utils.ts";
import { v4 } from "https://deno.land/std@0.116.0/uuid/mod.ts";
import { buildForecastKeyboardForLocation } from "../messages.ts";

const callbackDataKey = "location:notification_off";

const isDisableNotificationsCallback = (callback: TelegramCallbackQuery) =>
  callback.data?.includes(callbackDataKey) ?? false;

async function handleDisableNotificationsCallback(ctx: AuthenticatedContext, callback: TelegramCallbackQuery) {
  if (!isDisableNotificationsCallback(callback)) {
    throw new Error("is not enable notifications payload");
  }

  const [_, locationId] = callback.data!.split(callbackDataKey + ":");

  let location: UserLocation | null = null;
  if (v4.validate(locationId)) {
    location = await findLocationById(locationId);
  }

  if (!location) {
    throw new Error(`location with id ${locationId} doesn't exist`);
  }

  const count = await disableNotifications(location.id);
  if (count !== 1) {
    // TODO: rollback if this happens. Need transactions.
    throw new Error(`expected to update 1 notification, updated ${count}`);
  }

  const originalMessageId = callback.message.message_id;
  const originalMessageText = callback.message.text;
  const keyboard = buildForecastKeyboardForLocation({
    ...location,
    notificationsEnabled: !location.notificationsEnabled,
  });
  const message = withInlineKeyboard(response(ctx.user.telegramId, originalMessageText), keyboard);

  await ctx.telegramClient.updateMessage(originalMessageId, message);
  await ctx.telegramClient.answerCallbackQuery(callback, "Notifications disabled!");
}

// complies with CallbackUsecase interface
export default {
  handle: handleDisableNotificationsCallback,
  isValid: isDisableNotificationsCallback,
};
