import bookmarkLocationUsecase from "./callbacks/bookmarkLocation.ts";
import settingsUsecase from "./callbacks/settings.ts";
import forecastUsecase from "./callbacks/forecast.ts";

import { newForecastClient } from "./forecast.ts";
import { AuthenticatedContext } from "./middleware.ts";
import { findLocationByNameAndUser, listLocations } from "./repository/locations.ts";
import { findValid } from "./callbacks/callbackUsecase.ts";
import { newRetrospectiveForecastMessage } from "./retrospective.ts";
import { InlineKeyBoard, TelegramCallbackQuery, TelegramLocation, TelegramMessage } from "./telegram/types.ts";
import {
  bookmarkLocationInlineButton,
  enableNotificationsInlineButton,
  parseCommand,
  response,
  withForecastRequestInlineMenu,
  withInlineKeyboard,
  withSettingsInlineMenu,
} from "./telegram/utils.ts";
import { simpleMessage } from "./messages.ts";

export async function handleCallback(ctx: AuthenticatedContext, callback: TelegramCallbackQuery) {
  if (!callback.data) {
    throw new Error("telegram payload missing callback_query");
  }

  const usecases = [
    bookmarkLocationUsecase,
    settingsUsecase,
    forecastUsecase,
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
    return response(
      chatId,
      `
Los siguientes comandos están disponibles para su uso:

✔️ /now London, GB
Devuelve el tiempo para la ciudad en estos momentos.

✔️ /tomorrow Madrid, ES
Devuelve el tiempo para la ciudad mañana.

✔️ /settings
Permite gestionar las localidades guardadas.

✔️ /help
imprime esta ayuda.

Recuerda que si me estás llamando dentro de un group, seguramente tengas
que usar el sufijo con mi nombre: /help@weatherwarnbot.

Tambien puedes probar a enviarme una localización.
        `,
    );
  } else if (c.command == "now" || c.command === "tomorrow") {
    const geolocation = await ctx.geolocationClient.findLocation(c.city!);
    if (!geolocation) {
      throw new Error("Unable to geolocate town by name");
    }

    const message = await newRetrospectiveForecastMessage(ctx.weatherClient, c.command, {
      coordinates: { latitude: geolocation.latitude, longitude: geolocation.longitude },
      name: geolocation.name,
    });

    let keyboard: InlineKeyBoard;
    const location = await findLocationByNameAndUser(c.city!, ctx.user.id);

    if (location && location.notificationsEnabled === false) {
      // If it's a bookmarked location with disabled notifications, allow the user to enable them
      keyboard = [[enableNotificationsInlineButton(location.id)]];
    } else if (!location) {
      // If it's not bookmarked, allow to either bookmark or enable (which also bookmarks).
      const locationName = `${c.city},${c.country}`;
      keyboard = [[bookmarkLocationInlineButton(locationName)], [enableNotificationsInlineButton(locationName)]];
    } else {
      // If it's bookmarked and notifications are enabled, no keyboard is sent.
      keyboard = [];
    }

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
