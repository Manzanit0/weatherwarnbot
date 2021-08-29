import { Context } from "https://deno.land/x/oak@v9.0.0/context.ts";
import { isHttpError, Status } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { Logger } from "./logger.ts";
import { createUser, findUser, User } from "./repository.ts";
import { response, TelegramRequestBody } from "./telegram.ts";

export type ContextState = {
  logger: Logger;
  user?: User;
  payload?: TelegramRequestBody;
};

type OakContext = Context<ContextState, ContextState>;
type NxtFn = () => Promise<unknown>;

export async function responseTimeHeader(ctx: OakContext, next: NxtFn) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
}

export async function logRequest(ctx: OakContext, next: NxtFn) {
  await next();

  const dl = ctx.state.logger;
  const rt = ctx.response.headers.get("X-Response-Time");
  dl.info(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
  dl.debug(
    `body - ${JSON.stringify(await ctx.request.body({ type: "json" }).value)}`,
  );
}

export async function trackUser(ctx: OakContext, next: NxtFn) {
  const json = ctx.request.body({ type: "json" });
  const body = await json.value as TelegramRequestBody;
  const chatId = body.message.chat.id;

  let user = await findUser(chatId);
  if (!user) {
    user = await createUser({ telegramId: chatId });
  }

  ctx.state.user = user;
  await next();
}

export async function handleErrors(ctx: OakContext, next: NxtFn) {
  const dl = ctx.state.logger;

  try {
    await next();
  } catch (err) {
    const user = ctx.state.user;
    if (isHttpError(err)) {
      ctx.response.body = err.message;
      ctx.response.status = err.status;
    } else if (user) {
      dl.error(`User ${user.telegram_chat_id} triggered error "${err}"`);
      ctx.response.body = response(user.telegram_chat_id, err);
    } else {
      dl.error(`unknown error ${err}`);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: `${err}` };
    }
  }
}

export async function parseBody(ctx: OakContext, next: NxtFn) {
  const body = ctx.request.body({ type: "json" });
  const json = (await body.value) as TelegramRequestBody;
  if (!json) {
    ctx.throw(Status.BadRequest, "unable to parse body as JSON.");
  }

  ctx.state.payload = json;

  await next();
}
