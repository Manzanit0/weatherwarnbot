import bookmarkLocationUsecase from "./callbacks/bookmarkLocation.ts";
import settingsUsecase from "./callbacks/settings.ts";
import forecastUsecase from "./callbacks/forecast.ts";

import { buildForecastMessage, fetchWeatherByCoordinates } from "./forecast.ts";
import { AuthenticatedContext } from "./middleware.ts";
import { listLocations } from "./repository.ts";
import {
  answerCallbackQuery,
  parseCommand,
  response,
  TelegramCallbackQuery,
  withForecastRequestInlineMenu,
  withLocationInlineMenu,
  withSettingsInlineMenu,
} from "./telegram.ts";
import { findValid } from "./callbacks/callbackUsecase.ts";
import { newRetrospectiveForecastMessage } from "./retrospective.ts";

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
    await answerCallbackQuery(callback, `received ${callback.data} callback`);
  }
}

export async function handleLocation(ctx: AuthenticatedContext) {
  const json = ctx.payload;
  if (!json.message || !json.message.location) {
    throw new Error("telegram payload missing location");
  }

  const forecast = await fetchWeatherByCoordinates(
    json.message.location.latitude,
    json.message.location.longitude,
  );

  const message = buildForecastMessage(forecast);
  const chatId = ctx.user.telegramId;
  return response(chatId, message);
}

export async function handleCommand(ctx: AuthenticatedContext) {
  const json = ctx.payload;
  if (!json.message?.text) {
    throw new Error("telegram payload missing text");
  }

  const chatId = ctx.user.telegramId;

  const c = parseCommand(json.message.text);

  if ((c.command === "now" || c.command === "tomorrow") && !c.city) {
    const locationTuples = (await listLocations(ctx.user.id))
      .map((x) => [x.id, x.name!] as [string, string]);

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

    const message = await newRetrospectiveForecastMessage(c.command, {
      coordinates: { latitude: geolocation.latitude, longitude: geolocation.longitude },
      name: geolocation.name,
    });

    return withLocationInlineMenu(response(chatId, message), `${c.city},${c.country}`);
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
