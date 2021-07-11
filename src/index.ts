import { Application, Router } from "https://deno.land/x/oak@v7.7.0/mod.ts";
import { getForecastMessage } from "./forecast.ts";
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
    const chatId = json.message.from.id;
    if (!json) {
      context.response.body = response(chatId, "no body");
      return;
    }

    const [command, city, countryCode] = json.message.text.split(" ");
    dl.info("received telegram request", {
      command: command,
      city: city,
      countryCode: countryCode,
    });

    if (city && countryCode) {
      dl.info(`getting tomorrow's forecast for ${city} (${countryCode})`);
      context.response.body = response(
        chatId,
        await getForecastMessage(city, countryCode.toUpperCase())
      );
    } else {
      dl.warning("wrong command usage");
      context.response.body = response(
        chatId,
        "Wrong command usage. Required format: '/forecast madrid ES'"
      );
    }
  } catch (error) {
    dl.error("error when processing request:", error);

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
dl.info("starting http server on port", port);
app.listen({ port: port });
