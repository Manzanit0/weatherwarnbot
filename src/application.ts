import { Application, RouteParams, Router } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import {
  authenticatedContext,
  ContextState,
  handleErrors,
  logRequest,
  parseTelegramWebhookBody,
  responseTimeHeader,
  trackUser,
} from "./middleware.ts";
import { openWeatherMapClient, WeatherClient } from "./openweathermap.ts";
import { GeolocationClient, geolocationClient } from "./geolocation.ts";
import { TelegramClient, telegramClient } from "./telegram/client.ts";
import { handleCallback, handleCommand, handleLocation, handleUnknownPayload } from "./telegram_controller.ts";

type Params = {
  geolocation?: GeolocationClient;
  weather?: WeatherClient;
  telegram?: TelegramClient;
};

export default (params: Params = {}) => {
  const generalRouter = new Router<RouteParams, ContextState>();
  generalRouter.get("/", (ctx) => {
    ctx.response.status = 200;
    ctx.response.body = "Hello world!";
  });

  const telegramRouter = new Router<RouteParams, ContextState>();
  telegramRouter.prefix("/api/telegram");
  telegramRouter.use(parseTelegramWebhookBody);
  telegramRouter.use(trackUser);

  telegramRouter.post("/", async (ctx) => {
    const authCtx = authenticatedContext(ctx.state);
    const json = ctx.state.payload!;

    if (json.message) {
      if (json.message.location) {
        ctx.response.body = await handleLocation(authCtx, json.message.location);
      } else if (json.message.text) {
        ctx.response.body = await handleCommand(authCtx, json.message);
      } else {
        ctx.response.body = handleUnknownPayload(authCtx);
      }
    } else if (json.callback_query) {
      await handleCallback(authCtx, json.callback_query);
      ctx.response.body = "";
    }
  });

  const pc = params.geolocation ?? geolocationClient;
  const wc = params.weather ?? openWeatherMapClient;
  const tc = params.telegram ?? telegramClient;

  const app = new Application<ContextState>({
    state: { geolocationClient: pc, weatherClient: wc, telegramClient: tc },
    contextState: "prototype",
  });

  app.use(handleErrors);
  app.use(responseTimeHeader);
  app.use(logRequest);
  app.use(generalRouter.routes());
  app.use(generalRouter.allowedMethods());
  app.use(telegramRouter.routes());
  app.use(telegramRouter.allowedMethods());

  return app;
};
