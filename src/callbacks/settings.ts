import { AuthenticatedContext } from "../middleware.ts";
import { deleteLocationById, findLocationById, listLocations } from "../repository.ts";
import {
  answerCallbackQuery,
  response,
  sendMessage,
  TelegramRequestBody,
  updateMessage,
  withBackToSettingsInlineButton,
  withInlineKeyboard,
  withLocationsSettingsKeyboard,
  withSettingsInlineMenu,
} from "../telegram.ts";

const callbackDataKey = "settings:";

const isSettingsCallback = (body: TelegramRequestBody) => body.callback_query?.data.includes(callbackDataKey) ?? false;

const handleSettingsCallback = async (ctx: AuthenticatedContext) => {
  if (!isSettingsCallback(ctx.payload)) {
    throw new Error("is not settings payload");
  }

  const callbackData = ctx.payload.callback_query!.data;
  switch (callbackData) {
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
      if (callbackData.includes("settings:locations") && callbackData.includes(":delete")) {
        const [_n, nearlyLocationId] = callbackData.split("settings:locations:");
        const [locationId, _m] = nearlyLocationId.split(":delete");
        await handleDeleteLocationCallback(ctx, locationId);
      } else if (callbackData.includes("settings:locations")) {
        const [_, locationId] = callbackData.split("settings:locations:");
        await handleShowLocationCallback(ctx, locationId);
      }

      break;
    }
  }
};

const handleBackToSettingsCallback = async (ctx: AuthenticatedContext) => {
  const payload = withSettingsInlineMenu(response(ctx.user.telegram_chat_id, "What do you want to check?"));
  const originalMessageId = ctx.payload.callback_query!.message.message_id;
  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.payload, "Request processed!");
};

const handleDeleteDataCallback = async (ctx: AuthenticatedContext) => {
  await sendMessage(ctx.user.telegram_chat_id, "We will process your request within 30 days.");
  await answerCallbackQuery(ctx.payload, "Request processed!");
};

const handleNotificationSettingsCallback = async (ctx: AuthenticatedContext) => {
  const originalMessageId = ctx.payload.callback_query!.message.message_id;
  const payload = withBackToSettingsInlineButton(
    withInlineKeyboard(
      response(ctx.user.telegram_chat_id, "Here are your notification settings:"),
      [[
        { text: "🎚 Turn off", callback_data: "settings:notifications:off" },
        { text: "⏰ Set time", callback_data: "settings:notifications:set_time" },
      ]],
    ),
  );

  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.payload, "Succesfully listed locations!");
};

const handleListLocationsCallback = async (ctx: AuthenticatedContext) => {
  const originalMessageId = ctx.payload.callback_query!.message.message_id;
  const payload = await listLocationsPayload(ctx);
  await updateMessage(originalMessageId, payload);
  await answerCallbackQuery(ctx.payload, "Succesfully listed locations!");
};

const handleShowLocationCallback = async (ctx: AuthenticatedContext, locationId: string) => {
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("No location found");
  }

  const payload = withBackToSettingsInlineButton(
    withInlineKeyboard(
      response(ctx.user.telegram_chat_id, `Here it is: ${location.name}`),
      [[{ text: "❌ Delete location", callback_data: `settings:locations:${location.id}:delete` }]],
    ),
  );

  const originalMessageId = ctx.payload.callback_query!.message.message_id;
  await answerCallbackQuery(ctx.payload, "");
  await updateMessage(originalMessageId, payload);
};

const handleDeleteLocationCallback = async (ctx: AuthenticatedContext, locationId: string) => {
  const location = await findLocationById(locationId);
  if (!location) {
    throw new Error("No location found");
  }

  const amount = await deleteLocationById(locationId);
  if (amount === 1) {
    await answerCallbackQuery(ctx.payload, "Deletion successful!");
  } else if (amount === 0) {
    await answerCallbackQuery(ctx.payload, "We've hit a 🐛, try again later.");
  } else {
    await answerCallbackQuery(ctx.payload, "Uh oh... something went weird.");
    ctx.logger.info("More locations deleted than there should have been");
  }

  const originalMessageId = ctx.payload.callback_query!.message.message_id;
  const payload = await listLocationsPayload(ctx);
  await updateMessage(originalMessageId, payload);
};

const listLocationsPayload = async (ctx: AuthenticatedContext) => {
  const locations = await listLocations(ctx.user.id);
  const locationTuples = locations.map((x) => [`settings:locations:${x.id}`, x.name] as [string, string]);
  return withBackToSettingsInlineButton(
    withLocationsSettingsKeyboard(
      response(ctx.user.telegram_chat_id, "Which of these locations do you want to edit?"),
      locationTuples,
    ),
  );
};

export default {
  handle: handleSettingsCallback,
  isValid: isSettingsCallback,
};
