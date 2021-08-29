import {
  Application,
  RouteParams,
  Router,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { getLogger } from "./logger.ts";
import {
  ContextState,
  handleErrors,
  logRequest,
  parseBody,
  responseTimeHeader,
  trackUser,
} from "./middleware.ts";
import {
  handleCommand,
  handleLocation,
  handleUnknownPayload,
} from "./telegram_controller.ts";

const dl = await getLogger();

const router = new Router<RouteParams, ContextState>();

router.post("/api/telegram", async (ctx) => {
  const json = ctx.state.payload!;
  if (!json.message.location && !json.message.text) {
    ctx.response.body = handleUnknownPayload(ctx);
    return;
  }

  if (json.message.location) {
    ctx.response.body = await handleLocation(ctx);
  } else if (json.message.text) {
    ctx.response.body = await handleCommand(ctx);
  }
});

const app = new Application<ContextState>({
  state: { logger: dl },
  contextState: "prototype",
});

app.use(handleErrors);
app.use(parseBody);
app.use(responseTimeHeader);
app.use(trackUser);
app.use(logRequest);
app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PORT") ?? "8000");
dl.info(`starting http server on port ${port}`);
app.listen({ port: port });
