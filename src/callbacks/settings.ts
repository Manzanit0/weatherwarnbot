import { AuthenticatedContext } from "../middleware.ts";
import { deleteLocationById, findLocationById, listLocations } from "../repository.ts";
import { TelegramCallbackQuery } from "../telegram/types.ts";
import {
  response,
  withBackToSettingsInlineButton,
  withInlineKeyboard,
  withLocationsSettingsKeyboard,
  withSettingsInlineMenu,
} from "../telegram/utils.ts";

const callbackDataKey = "settings:";

const isSettingsCallback = (callback: TelegramCallbackQuery) => callback.data?.includes(callbackDataKey) ?? false;

const handleSettingsCallback = async (ctx: AuthenticatedContext, callback: TelegramCallbackQuery) => {
  if (!isSettingsCallback(callback)) {
    throw new Error("is not settings payload");
  }

  const data = callback.data!;
  switch (data) {
    // Go back to initial settings screen.
    case "settings:back": {
      await handleBackToSettingsCallback(ctx, callback);
      break;
    }
    case "settings:delete": {
      await handleDeleteDataCallback(ctx, callback);
      break;
    }
    case "settings:locations": {
      await handleListLocationsCallback(ctx, callback);
      break;
    }
    case "settings:notifications": {
      await handleNotificationSettingsCallback(ctx, callback);
      break;
    }
    default: {
      if (data.includes("settings:locations") && data.includes(":delete")) {
        const [_n, nearlyLocationId] = data.split("settings:locations:");
        const [locationId, _m] = nearlyLocationId.split(":delete");
        await handleDeleteLocationCallback(ctx, callback, locationId);
      } else if (data.includes("settings:locations")) {
        const [_, locationId] = data.split("settings:locations:");
        await handleShowLocationCallback(ctx, callback, locationId);
      }

      break;
    }
  }
};

const handleBackToSettingsCallback = async (ctx: AuthenticatedContext, callback: TelegramCallbackQuery) => {
  const payload = withSettingsInlineMenu(response(ctx.user.telegramId, "What do you want to check?"));
  const originalMessageId = callback.message.message_id;
  await ctx.telegramClient.updateMessage(originalMessageId, payload);
  await ctx.telegramClient.answerCallbackQuery(callback, "Request processed!");
};

const handleDeleteDataCallback = async (ctx: AuthenticatedContext, callback: TelegramCallbackQuery) => {
  await ctx.telegramClient.sendMessage(ctx.user.telegramId, "We will process your request within 30 days.");
  await ctx.telegramClient.answerCallbackQuery(callback, "Request processed!");
};

const handleNotificationSettingsCallback = async (ctx: AuthenticatedContext, callback: TelegramCallbackQuery) => {
  const originalMessageId = callback.message.message_id;
  const payload = withBackToSettingsInlineButton(
    withInlineKeyboard(
      response(ctx.user.telegramId, "Here are your notification settings:"),
      [[
        { text: "🎚 Turn off", callback_data: "settings:notifications:off" },
        { text: "⏰ Set time", callback_data: "settings:notifications:set_time" },
      ]],
    ),
  );

  await ctx.telegramClient.updateMessage(originalMessageId, payload);
  await ctx.telegramClient.answerCallbackQuery(callback, "Succesfully listed locations!");
};

const handleListLocationsCallback = async (ctx: AuthenticatedContext, callback: TelegramCallbackQuery) => {
  const originalMessageId = callback.message.message_id;
  const payload = await listLocationsPayload(ctx);
  await ctx.telegramClient.updateMessage(originalMessageId, payload);
  await ctx.telegramClient.answerCallbackQuery(callback, "Succesfully listed locations!");
};

const handleShowLocationCallback = async (
  ctx: AuthenticatedContext,
  callback: TelegramCallbackQuery,
  locationId: string,
) => {
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("No location found");
  }

  const payload = withBackToSettingsInlineButton(
    withInlineKeyboard(
      response(ctx.user.telegramId, `Here it is: ${location.name}`),
      [[{ text: "❌ Delete location", callback_data: `settings:locations:${location.id}:delete` }]],
    ),
  );

  const originalMessageId = callback.message.message_id;
  await ctx.telegramClient.answerCallbackQuery(callback, "");
  await ctx.telegramClient.updateMessage(originalMessageId, payload);
};

const handleDeleteLocationCallback = async (
  ctx: AuthenticatedContext,
  callback: TelegramCallbackQuery,
  locationId: string,
) => {
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("No location found");
  }

  const amount = await deleteLocationById(locationId);
  if (amount === 1) {
    await ctx.telegramClient.answerCallbackQuery(callback, "Deletion successful!");
  } else if (amount === 0) {
    await ctx.telegramClient.answerCallbackQuery(callback, "We've hit a 🐛, try again later.");
  } else {
    await ctx.telegramClient.answerCallbackQuery(callback, "Uh oh... something went weird.");
    ctx.logger.info("More locations deleted than there should have been");
  }

  const originalMessageId = callback.message.message_id;
  const payload = await listLocationsPayload(ctx);
  await ctx.telegramClient.updateMessage(originalMessageId, payload);
};

const listLocationsPayload = async (ctx: AuthenticatedContext) => {
  const locations = await listLocations(ctx.user.id);
  const locationTuples = locations.map((x) => [`settings:locations:${x.id}`, x.name] as [string, string]);
  return withBackToSettingsInlineButton(
    withLocationsSettingsKeyboard(
      response(ctx.user.telegramId, "Which of these locations do you want to edit?"),
      locationTuples,
    ),
  );
};

export default {
  handle: handleSettingsCallback,
  isValid: isSettingsCallback,
};
