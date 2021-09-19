import {
  RouteParams,
  RouterContext,
} from "https://deno.land/x/oak@v9.0.0/router.ts";
import {
  buildForecastMessage,
  Day,
  fetchWeather,
  fetchWeatherByCoordinates,
} from "./forecast.ts";
import { ContextState } from "./middleware.ts";
import { createUserLocation, findUserLocation } from "./repository.ts";
import {
  answerCallbackQuery,
  parseCommand,
  response,
  withInlineMenu,
} from "./telegram.ts";

export async function handleCallback(
  ctx: RouterContext<RouteParams, ContextState>,
) {
  const json = ctx.state.payload!;

  if (!json.callback_query) {
    throw new Error("telegram payload missing callback_query");
  }

  const data = json.callback_query.data;
  if (!json.callback_query.data.includes("location")) {
    await answerCallbackQuery(json, `received ${data} callback`);
    return;
  }

  // FIXME: Temporary hack which assumes specific message.
  // \ud83d\udea9 Torrejon de la calzada (ES)\n    - - - - -
  // Ideally the callback data would contain the location name.
  const name = json.callback_query.message.text
    .split("(")
    .shift()
    ?.split(" ")
    ?.slice(1)
    ?.join(" ")
    ?.trim();
  if (!name) {
    throw new Error("Got a message that was not expecting");
  }

  const location = await findUserLocation(name);
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

  await createUserLocation({
    user_id: ctx.state.user!.id,
    name: geolocation.name,
    coordinates: {
      latitude: geolocation.latitude,
      longitude: geolocation.longitude,
    },
    positionstack: geolocation,
  });

  await answerCallbackQuery(json, "Location bookmarked!");
}

export async function handleLocation(
  ctx: RouterContext<RouteParams, ContextState>,
) {
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

export async function handleCommand(
  ctx: RouterContext<RouteParams, ContextState>,
) {
  const json = ctx.state.payload!;
  if (!json.message!.text) {
    throw new Error("telegram payload missing text");
  }

  const chatId = ctx.state.user!.telegram_chat_id;

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
    const forecast = await fetchWeather(c.city!, c.country!, Day.TODAY);
    const message = buildForecastMessage(forecast);
    return withInlineMenu(response(chatId, message));
  } else if (c.command == "tomorrow") {
    ctx.state.logger.info(
      `getting todays's forecast for ${c.city} (${c.country})`,
    );
    const forecast = await fetchWeather(c.city!, c.country!, Day.TOMORROW);
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
