import { Application, Router } from "https://deno.land/x/oak@v7.7.0/mod.ts";
import {
  buildForecastMessage,
  Day,
  fetchWeather,
  fetchWeatherByCoordinates,
} from "./forecast.ts";
import { getLogger } from "./logger.ts";
import { parseCommand, response, TelegramRequestBody } from "./telegram.ts";

const dl = await getLogger();

const router = new Router();
router.post("/api/telegram", async (context) => {
  const json = (await context.request.body({ type: "json" })
    .value) as TelegramRequestBody;
  if (!json) {
    throw new Error("no body in payload");
  }

  const chatId = json.message.chat.id;

  try {
    if (json.message.location) {
      dl.info(`getting todays's forecast for location`);
      const forecast = await fetchWeatherByCoordinates(
        json.message.location.latitude,
        json.message.location.longitude
      );
      const message = buildForecastMessage(forecast);
      context.response.body = response(chatId, message);
    } else if (json.message.text) {
      const c = parseCommand(json.message.text);

      if (c.command == "help") {
        context.response.body = response(
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
        `
        );
      } else if (c.command == "now") {
        if (c.city && c.country) {
          dl.info(`getting todays's forecast for ${c.city} (${c.country})`);
          const forecast = await fetchWeather(c.city, c.country, Day.TODAY);
          const message = buildForecastMessage(forecast);
          context.response.body = response(chatId, message);
        } else {
          dl.warning("wrong command usage");
          context.response.body = response(
            chatId,
            "Wrong command usage. Required format: '/now madrid ES'"
          );
        }
      } else if (c.command == "tomorrow") {
        if (c.city && c.country) {
          dl.info(`getting todays's forecast for ${c.city} (${c.country})`);
          const forecast = await fetchWeather(c.city, c.country, Day.TODAY);
          const message = buildForecastMessage(forecast);
          context.response.body = response(chatId, message);
        } else {
          dl.warning("wrong command usage");
          context.response.body = response(
            chatId,
            "Wrong command usage. Required format: '/now madrid ES'"
          );
        }
      } else {
        context.response.body = response(
          chatId,
          `
        Desconozco ese comando... prueba con /help para ver lo que conozco.
        `
        );
      }
    } else {
      context.response.body = response(
        chatId,
        "What the hell did you just send me? STFU..."
      );
    }
  } catch (error) {
    dl.error(`error when processing request: ${error}`);
    context.response.body = response(chatId, error.message);
  }
});

const app = new Application();

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  dl.info(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
  dl.debug(
    `body - ${JSON.stringify(await ctx.request.body({ type: "json" }).value)}`
  );
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PORT") ?? "8000");
dl.info(`starting http server on port ${port}`);
app.listen({ port: port });
