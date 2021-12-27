import bookmarkLocationUsecase from "./callbacks/bookmarkLocation.ts";
import settingsUsecase from "./callbacks/settings.ts";
import forecastUsecase from "./callbacks/forecast.ts";
import enableNotificationsUsecase from "./callbacks/enableNotifications.ts";
import disableNotificationsUsecase from "./callbacks/disableNotifications.ts";

import { newForecastClient } from "./forecast.ts";
import { AuthenticatedContext } from "./middleware.ts";
import { listLocations } from "./repository/locations.ts";
import { findValid } from "./callbacks/callbackUsecase.ts";
import { newRetrospectiveForecastMessage } from "./retrospective.ts";
import { TelegramCallbackQuery, TelegramLocation, TelegramMessage } from "./telegram/types.ts";
import {
  parseCommand,
  response,
  withForecastRequestInlineMenu,
  withInlineKeyboard,
  withSettingsInlineMenu,
} from "./telegram/utils.ts";
import { buildForecastKeyboard, helpText, simpleMessage } from "./messages.ts";

export async function handleCallback(ctx: AuthenticatedContext, callback: TelegramCallbackQuery) {
  if (!callback.data) {
    throw new Error("telegram payload missing callback_query");
  }

  const usecases = [
    bookmarkLocationUsecase,
    settingsUsecase,
    forecastUsecase,
    enableNotificationsUsecase,
    disableNotificationsUsecase,
  ];

  const usecase = findValid(usecases, callback);
  if (usecase) {
    await usecase.handle(ctx, callback);
  } else {
    await ctx.telegramClient.answerCallbackQuery(callback, `received ${callback.data} callback`);
  }
}

export async function handleLocation(ctx: AuthenticatedContext, location: TelegramLocation) {
  const c = newForecastClient(ctx.weatherClient);
  const forecast = await c.fetchWeatherByCoordinates(
    location.latitude,
    location.longitude,
  );

  const message = simpleMessage(forecast);
  const chatId = ctx.user.telegramId;
  return response(chatId, message);
}

export async function handleCommand(ctx: AuthenticatedContext, message: TelegramMessage) {
  if (!message?.text) {
    throw new Error("telegram payload missing text");
  }

  const chatId = ctx.user.telegramId;

  const c = parseCommand(message.text);

  if ((c.command === "now" || c.command === "tomorrow") && !c.city) {
    const locationTuples = (await listLocations(ctx.user.id))
      .map((x) => [x.id, x.name!] as [string, string]);

    if (locationTuples.length === 0) {
      return response(
        chatId,
        `You need to tell me which city to check the weather for, give me the city followed by a comma and the country code; try with \`/${c.command} London,GB\``,
      );
    }

    // TODO: if list is empty, allow user to provide city/code?
    return withForecastRequestInlineMenu(
      response(chatId, "Which location do you want to check the weather for?"),
      c.command,
      locationTuples,
    );
  }

  if (c.command === "settings") {
    return withSettingsInlineMenu(response(chatId, "What do you want to check?"));
  } else if (c.command == "help") {
    return response(chatId, helpText);
  } else if (c.command == "now" || c.command === "tomorrow") {
    const geolocation = await ctx.geolocationClient.findLocation(c.city!);
    if (!geolocation) {
      throw new Error("Unable to geolocate town by name");
    }

    const message = await newRetrospectiveForecastMessage(ctx.weatherClient, c.command, {
      coordinates: { latitude: geolocation.latitude, longitude: geolocation.longitude },
      name: geolocation.name,
    });

    const keyboard = await buildForecastKeyboard(ctx.user, c);
    return withInlineKeyboard(response(chatId, message), keyboard);
  } else {
    return response(
      chatId,
      `
        Desconozco ese comando... prueba con /help para ver lo que conozco.
        `,
    );
  }
}

export function handleUnknownPayload(ctx: AuthenticatedContext) {
  const chatId = ctx.user.telegramId;
  return response(
    chatId,
    "What the hell did you just send me? STFU...",
  );
}
