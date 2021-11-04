import { Application, RouteParams, Router } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { getLogger } from "./logger.ts";
import {
  authenticatedContext,
  ContextState,
  handleErrors,
  logRequest,
  parseTelegramWebhookBody,
  responseTimeHeader,
  trackUser,
} from "./middleware.ts";
import { PositionStackClient } from "./positionstack.ts";
import { handleCallback, handleCommand, handleLocation, handleUnknownPayload } from "./telegram_controller.ts";

const generalRouter = new Router<RouteParams, ContextState>();
generalRouter.get("/", (ctx) => {
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

const dl = await getLogger();
const pc = new PositionStackClient(dl);
const app = new Application<ContextState>({
  state: { logger: dl, geolocationClient: pc },
  contextState: "prototype",
});

app.use(handleErrors);
app.use(responseTimeHeader);
app.use(logRequest);
app.use(generalRouter.routes());
app.use(generalRouter.allowedMethods());
app.use(telegramRouter.routes());
app.use(telegramRouter.allowedMethods());

const port = Number(Deno.env.get("PORT") ?? "8000");
dl.info(`starting http server on port ${port}`);
app.listen({ port: port });
