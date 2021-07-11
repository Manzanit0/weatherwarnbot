import { Application, Router } from "https://deno.land/x/oak@v7.7.0/mod.ts";
import {
  buildForecastMessage,
  Day,
  fetchWeather,
  fetchWeatherByCoordinates,
} from "./forecast.ts";
import { response, TelegramRequestBody } from "./telegram.ts";
import * as log from "https://deno.land/std@0.100.0/log/mod.ts";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: "{datetime} {levelName} {msg}",
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

const dl = log.getLogger();

const router = new Router();
router.post("/api/telegram", async (context) => {
  try {
    const json = (await context.request.body({ type: "json" })
      .value) as TelegramRequestBody;
    const chatId = json.message.chat.id;
    if (!json) {
      context.response.body = response(chatId, "no body");
      return;
    }

    if (json.message.location) {
      dl.info(`getting todays's forecast for location`);
      const forecast = await fetchWeatherByCoordinates(
        json.message.location.latitude,
        json.message.location.longitude
      );
      const message = buildForecastMessage(forecast);
      context.response.body = response(chatId, message);
    } else if (json.message.text) {
      const [command, city, countryCode] = json.message.text.split(" ");
      dl.info("received telegram request", {
        command: command,
        city: city,
        countryCode: countryCode,
      });

      // Must do .includes() instead of exact match due to groups.
      if (command.includes("/tomorrow")) {
        if (city && countryCode) {
          dl.info(`getting tomorrow's forecast for ${city} (${countryCode})`);
          const forecast = await fetchWeather(city, countryCode, Day.TOMORROW);
          const message = buildForecastMessage(forecast);
          context.response.body = response(chatId, message);
        } else {
          dl.warning("wrong command usage");
          context.response.body = response(
            chatId,
            "Wrong command usage. Required format: '/tomorrow madrid ES'"
          );
        }
      } else if (command.includes("/now")) {
        if (city && countryCode) {
          dl.info(`getting todays's forecast for ${city} (${countryCode})`);
          const forecast = await fetchWeather(city, countryCode, Day.TODAY);
          const message = buildForecastMessage(forecast);
          context.response.body = response(chatId, message);
        } else {
          dl.warning("wrong command usage");
          context.response.body = response(
            chatId,
            "Wrong command usage. Required format: '/now madrid ES'"
          );
        }
      } else if (command.includes("/help")) {
        context.response.body = response(
          chatId,
          `
        Los siguientes comandos están disponibles para su uso: \n
        ✔️ /now {CIUDAD} {CODIGO_PAIS}
        \t Devuelve el tiempo para la ciudad en estos momentos.\n
        ✔️ /tomorrow {CIUDAD} {CODIGO_PAIS}
        \t Devuelve el tiempo para la ciudad mañana.\n
        ✔️ /help
        \t imprime esta ayuda.\n
        Recuerda que si me estás llamando dentro de un group, seguramente tengas
        que usar el sufijo con mi nombre: /help@weatherwarnbot.\n
        Tambien puedes probar a enviarme una localización.
        `
        );
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

    context.response.body = {
      message: error,
    };
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
