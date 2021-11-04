import { deleteLocationById, findLocationById, listLocations } from "../repository.ts";
import {
  answerCallbackQuery,
  response,
  sendMessage,
  TelegramCallbackQuery,
  updateMessage,
  withBackToSettingsInlineButton,
  withInlineKeyboard,
  withLocationsSettingsKeyboard,
  withSettingsInlineMenu,
} from "../telegram.ts";
import { CallbackContext } from "./callbackUsecase.ts";

const callbackDataKey = "settings:";

const isSettingsCallback = (callback: TelegramCallbackQuery) => callback.data?.includes(callbackDataKey) ?? false;

const handleSettingsCallback = async (ctx: CallbackContext) => {
  if (!isSettingsCallback(ctx.callback)) {
    throw new Error("is not settings payload");
  }

  const data = ctx.callback.data!;
  switch (data) {
    // Go back to initial settings screen.
    case "settings:back": {
      await handleBackToSettingsCallback(ctx);
      break;
    }
    case "settings:delete": {
      await handleDeleteDataCallback(ctx);
      break;
    }
    case "settings:locations": {
      await handleListLocationsCallback(ctx);
      break;
    }
    case "settings:notifications": {
      await handleNotificationSettingsCallback(ctx);
      break;
    }
    default: {
      if (data.includes("settings:locations") && data.includes(":delete")) {
        const [_n, nearlyLocationId] = data.split("settings:locations:");
        const [locationId, _m] = nearlyLocationId.split(":delete");
        await handleDeleteLocationCallback(ctx, locationId);
      } else if (data.includes("settings:locations")) {
        const [_, locationId] = data.split("settings:locations:");
        await handleShowLocationCallback(ctx, locationId);
      }

      break;
    }
  }
};

const handleBackToSettingsCallback = async (ctx: CallbackContext) => {
  const payload = withSettingsInlineMenu(response(ctx.user.telegramId, "What do you want to check?"));
  const originalMessageId = ctx.callback.message.message_id;
  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.callback, "Request processed!");
};

const handleDeleteDataCallback = async (ctx: CallbackContext) => {
  await sendMessage(ctx.user.telegramId, "We will process your request within 30 days.");
  await answerCallbackQuery(ctx.callback, "Request processed!");
};

const handleNotificationSettingsCallback = async (ctx: CallbackContext) => {
  const originalMessageId = ctx.callback.message.message_id;
  const payload = withBackToSettingsInlineButton(
    withInlineKeyboard(
      response(ctx.user.telegramId, "Here are your notification settings:"),
      [[
        { text: "🎚 Turn off", callback_data: "settings:notifications:off" },
        { text: "⏰ Set time", callback_data: "settings:notifications:set_time" },
      ]],
    ),
  );

  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.callback, "Succesfully listed locations!");
};

const handleListLocationsCallback = async (ctx: CallbackContext) => {
  const originalMessageId = ctx.callback.message.message_id;
  const payload = await listLocationsPayload(ctx);
  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.callback, "Succesfully listed locations!");
};

const handleShowLocationCallback = async (ctx: CallbackContext, locationId: string) => {
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

  const originalMessageId = ctx.callback.message.message_id;
  await answerCallbackQuery(ctx.callback, "");
  await updateMessage(originalMessageId, payload);
};

const handleDeleteLocationCallback = async (ctx: CallbackContext, locationId: string) => {
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("No location found");
  }

  const amount = await deleteLocationById(locationId);
  if (amount === 1) {
    await answerCallbackQuery(ctx.callback, "Deletion successful!");
  } else if (amount === 0) {
    await answerCallbackQuery(ctx.callback, "We've hit a 🐛, try again later.");
  } else {
    await answerCallbackQuery(ctx.callback, "Uh oh... something went weird.");
    ctx.logger.info("More locations deleted than there should have been");
  }

  const originalMessageId = ctx.callback.message.message_id;
  const payload = await listLocationsPayload(ctx);
  await updateMessage(originalMessageId, payload);
};

const listLocationsPayload = async (ctx: CallbackContext) => {
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
