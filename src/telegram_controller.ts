import { CallbackUsecase } from "./callbacks/callbackUsecase.ts";
import bookmarkLocationUsecase from "./callbacks/bookmarkLocation.ts";
import settingsUsecase from "./callbacks/settings.ts";

import { buildForecastMessage, Day, fetchWeatherByCoordinates, fetchWeatherByName } from "./forecast.ts";
import { AuthenticatedContext } from "./middleware.ts";
import { findLocationById, listLocations } from "./repository.ts";
import {
  answerCallbackQuery,
  parseCommand,
  response,
  sendMessage,
  withForecastRequestInlineMenu,
  withLocationInlineMenu,
  withSettingsInlineMenu,
} from "./telegram.ts";

const usecases: CallbackUsecase[] = [
  bookmarkLocationUsecase,
  settingsUsecase,
];

export async function handleCallback(ctx: AuthenticatedContext) {
  const data = ctx.payload.callback_query?.data;
  if (!data) {
    throw new Error("telegram payload missing callback_query");
  }

  usecases.forEach((x) => x.isValid(ctx.payload) ? x.handle(ctx) : null);

  if (data.includes("forecast:")) {
    const locationId = data.split(":")[2];
    if (!locationId) {
      throw new Error("Unable to extract location name from callback_query");
    }

    // To receive this kind of payload, the location must have been bookmarked.
    const location = await findLocationById(locationId);
    if (!location) {
      throw new Error("received forecast:now callback for a location that doesn't exist");
    }

    const forecastDay = data.includes("forecast:tomorrow") ? Day.TOMORROW : Day.TODAY;
    const forecast = await fetchWeatherByCoordinates(
      location.coordinates.latitude,
      location.coordinates.longitude,
      forecastDay,
    );

    await answerCallbackQuery(ctx.payload, `Fetching weather for ${location.name || "location"}`);
    const message = buildForecastMessage({ ...forecast, location: location.name! });
    sendMessage(ctx.user.telegram_chat_id, message);
  } else {
    await answerCallbackQuery(ctx.payload, `received ${data} callback`);
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
  const chatId = ctx.user.telegram_chat_id;
  return response(chatId, message);
}

export async function handleCommand(ctx: AuthenticatedContext) {
  const json = ctx.payload;
  if (!json.message!.text) {
    throw new Error("telegram payload missing text");
  }

  const chatId = ctx.user.telegram_chat_id;

  // Shortlist empty command.
  const lowerCaseText = json.message!.text
    .toLowerCase()
    .trim()
    .replace("/", "");

  if (lowerCaseText === "now" || lowerCaseText === "tomorrow") {
    const locationTuples = (await listLocations(ctx.user.id))
      .map((x) => [x.id, x.name!] as [string, string]);

    return withForecastRequestInlineMenu(
      response(chatId, "Which location do you want to check the weather for?"),
      lowerCaseText,
      locationTuples,
    );
  }

  const c = parseCommand(json.message!.text);

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

        ✔️ /help
        imprime esta ayuda.

        Recuerda que si me estás llamando dentro de un group, seguramente tengas
        que usar el sufijo con mi nombre: /help@weatherwarnbot.

        Tambien puedes probar a enviarme una localización.
        `,
    );
  } else if (c.command == "now") {
    ctx.logger.info(`getting todays's forecast for ${c.city} (${c.country})`);
    const forecast = await fetchWeatherByName(c.city!, c.country!, Day.TODAY);
    const message = buildForecastMessage(forecast);
    return withLocationInlineMenu(response(chatId, message), `${c.city},${c.country}`);
  } else if (c.command == "tomorrow") {
    ctx.logger.info(
      `getting todays's forecast for ${c.city} (${c.country})`,
    );
    const forecast = await fetchWeatherByName(
      c.city!,
      c.country!,
      Day.TOMORROW,
    );
    const message = buildForecastMessage(forecast);
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
  const chatId = ctx.user.telegram_chat_id;
  return response(
    chatId,
    "What the hell did you just send me? STFU...",
  );
}
