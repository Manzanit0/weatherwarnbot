import { RouteParams, RouterContext } from "https://deno.land/x/oak@v9.0.0/router.ts";
import { buildForecastMessage, Day, fetchWeatherByCoordinates, fetchWeatherByName } from "./forecast.ts";
import { ContextState } from "./middleware.ts";
import { createUserLocation, findLocationByNameAndUser, listLocations } from "./repository.ts";
import {
  answerCallbackQuery,
  parseCommand,
  response,
  sendMessage,
  withForecastRequestInlineMenu,
  withInlineMenu,
} from "./telegram.ts";

// handleCallback handles (or will handle at some point ;-)) the following series of callback data:
// - forecast:new:<location>
// - forecast:tomorrow:<location>
// - location:new:<location>
// Where <location> is the location name.
export async function handleCallback(ctx: RouterContext<RouteParams, ContextState>) {
  const json = ctx.state.payload!;
  const data = json.callback_query?.data;
  if (!data) {
    throw new Error("telegram payload missing callback_query");
  }

  if (data === "location") {
    await bookmarkLocation(ctx);
    await answerCallbackQuery(json, "Location bookmarked!");
  } else if (data.includes("forecast:now")) {
    const name = data.split(":")[2];
    if (!name) {
      throw new Error("Unable to extract location name from callback_query");
    }

    // To receive this kind of payload, the location must have been bookmarked.
    const location = await findLocationByNameAndUser(name, ctx.state.user!.id);
    if (!location) {
      throw new Error("received forecast:now callback for a location that doesn't exist");
    }

    const forecast = await fetchWeatherByCoordinates(
      location.coordinates.latitude,
      location.coordinates.longitude,
    );

    await answerCallbackQuery(json, `Fetching weather for ${name}`);
    const message = buildForecastMessage({ ...forecast, location: name });
    sendMessage(ctx.state.user!.telegram_chat_id, message);
    return;
  } else {
    await answerCallbackQuery(json, `received ${data} callback`);
    return;
  }
}

export async function handleLocation(ctx: RouterContext<RouteParams, ContextState>) {
  const json = ctx.state.payload!;
  if (!json.message || !json.message.location) {
    throw new Error("telegram payload missing location");
  }

  const forecast = await fetchWeatherByCoordinates(
    json.message.location.latitude,
    json.message.location.longitude,
  );

  const message = buildForecastMessage(forecast);
  const chatId = ctx.state.user!.telegram_chat_id;
  return response(chatId, message);
}

export async function handleCommand(ctx: RouterContext<RouteParams, ContextState>) {
  const json = ctx.state.payload!;
  if (!json.message!.text) {
    throw new Error("telegram payload missing text");
  }

  const chatId = ctx.state.user!.telegram_chat_id;

  // Shortlist empty command.
  const lowerCaseText = json.message!.text
    .toLowerCase()
    .trim()
    .replace("/", "");

  if (lowerCaseText === "now" || lowerCaseText === "tomorrow") {
    const locationNames = (await listLocations(ctx.state.user!.id)).map(
      (x) => x.name!,
    );

    return withForecastRequestInlineMenu(
      response(chatId, "Which location do you want to check the weather for?"),
      lowerCaseText,
      locationNames,
    );
  }

  const c = parseCommand(json.message!.text);

  if (c.command == "help") {
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
    ctx.state.logger.info(
      `getting todays's forecast for ${c.city} (${c.country})`,
    );
    const forecast = await fetchWeatherByName(c.city!, c.country!, Day.TODAY);
    const message = buildForecastMessage(forecast);
    return withInlineMenu(response(chatId, message));
  } else if (c.command == "tomorrow") {
    ctx.state.logger.info(
      `getting todays's forecast for ${c.city} (${c.country})`,
    );
    const forecast = await fetchWeatherByName(
      c.city!,
      c.country!,
      Day.TOMORROW,
    );
    const message = buildForecastMessage(forecast);
    return withInlineMenu(response(chatId, message));
  } else {
    return response(
      chatId,
      `
        Desconozco ese comando... prueba con /help para ver lo que conozco.
        `,
    );
  }
}

export function handleUnknownPayload(
  ctx: RouterContext<RouteParams, ContextState>,
) {
  const chatId = ctx.state.user!.telegram_chat_id;
  return response(
    chatId,
    "What the hell did you just send me? STFU...",
  );
}

// FIXME: Temporary hack which assumes specific message.
// \ud83d\udea9 Torrejon de la calzada (ES)\n    - - - - -
// Ideally the callback data would contain the location name.
const extractLocationNameFromMessage = (msg: string) => msg.split("(").shift()?.split(" ")?.slice(1)?.join(" ")?.trim();

async function bookmarkLocation(ctx: RouterContext<RouteParams, ContextState>) {
  const json = ctx.state.payload!;

  const message = json?.callback_query?.message?.text;
  if (!message) {
    throw new Error("callback_query doesn't contain reference message");
  }

  const name = extractLocationNameFromMessage(message);
  if (!name) {
    throw new Error(
      "Unable to extract location name from reference message in callback_query",
    );
  }

  const location = await findLocationByNameAndUser(name, ctx.state.user!.id);
  if (location) {
    await answerCallbackQuery(json, "Location already bookmarked!");
    return;
  }

  const geolocation = await ctx.state.geolocationClient.findLocation(name);
  if (!geolocation) {
    await answerCallbackQuery(json, "Unable to geolocate location by name");
    return;
  }

  ctx.state.logger.info(
    `found location ${geolocation.name} through PositionStack`,
  );

  ctx.state.logger.debug(`location=${JSON.stringify(geolocation)}`);

  return createUserLocation({
    user_id: ctx.state.user!.id,
    name: geolocation.name,
    coordinates: {
      latitude: geolocation.latitude,
      longitude: geolocation.longitude,
    },
    positionstack: geolocation,
  });
}
