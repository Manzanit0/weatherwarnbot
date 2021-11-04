import { Context } from "https://deno.land/x/oak@v9.0.0/context.ts";
import { isHttpError, RouteParams, RouterContext, Status } from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { Logger } from "./logger.ts";
import { GeolocationClient } from "./positionstack.ts";
import { createUser, CreateUserParams, findUser, updateUser, UpdateUserParams, User } from "./repository.ts";
import { getChatId, response, TelegramRequestBody } from "./telegram.ts";

export type ContextState = {
  geolocationClient: GeolocationClient;
  logger: Logger;
  user?: User;
  payload?: TelegramRequestBody;
};

type OakContext =
  | Context<ContextState, ContextState>
  | RouterContext<RouteParams, ContextState>;

type NxtFn = () => Promise<unknown>;

export async function requestIdHeader(ctx: OakContext, next: NxtFn) {
  ctx.response.headers.set("X-Request-Id", crypto.randomUUID());
  await next();
}

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

  // FIXME: rt is always null.
  dl.info(
    `${ctx.request.method} ${ctx.request.url} - ${ctx.response.status} - ${rt}`,
  );
}

export async function parseTelegramWebhookBody(ctx: OakContext, next: NxtFn) {
  if (!ctx.request.hasBody) {
    ctx.throw(Status.BadRequest, "no payload sent");
  }

  const body = ctx.request.body({ type: "json" });
  const json = (await body.value) as TelegramRequestBody;

  // TODO: we actually need to assert the whole thing here.
  const isInvalidMessage = !json?.message || !json?.message?.chat?.id;
  const isInvalidCallback = !json?.callback_query;
  if (!json || (isInvalidCallback && isInvalidMessage)) {
    ctx.throw(Status.BadRequest, "payload doesn't fulfill Telegram schema");
  }

  ctx.state.payload = json;
  await next();
}

export async function trackUser(ctx: OakContext, next: NxtFn) {
  const json = ctx.state.payload!;
  const chatId = getChatId(json);
  if (!chatId) {
    ctx.throw(Status.BadRequest, "missing chat_id in Telegram payload.");
  }

  // TODO: we need to validate if it's a group, and update the user as the
  // group.  Currently it's creating a user for the group and using the
  // messaging user's details.

  let user = await findUser(chatId);
  if (!user) {
    let userParams: CreateUserParams;
    if (json.callback_query?.from) {
      userParams = { ...json.callback_query.from, telegramId: chatId };
    } else if (json.message?.from) {
      userParams = { ...json.message.from, telegramId: chatId };
    } else {
      // Should have either one or the other.
      ctx.throw(Status.BadRequest, "Invalid payload");
    }

    user = await createUser(userParams);
  } else if (!user.username) {
    let userParams: UpdateUserParams;
    if (json.callback_query?.from) {
      userParams = { ...user, ...json.callback_query.from, telegramId: chatId };
      user = await updateUser(userParams);
    } else if (json.message?.from) {
      userParams = { ...user, ...json.message.from, telegramId: chatId };
      user = await updateUser(userParams);
    }
  }

  ctx.state.user = user;
  ctx.state.logger.info(`handling request for user with chatId:${chatId}`);
  await next();
}

export async function handleErrors(ctx: OakContext, next: NxtFn) {
  const dl = ctx.state.logger;

  try {
    await next();
  } catch (err) {
    const u = ctx.request.url;
    const m = ctx.request.method;
    const b = await ctx.request.body({ type: "text" }).value;
    dl.warning(`request failed: ${m} ${u} - ${b}`);
    dl.error(`error: ${err}`);

    const user = ctx.state.user;
    if (isHttpError(err)) {
      ctx.response.body = { error: err.message };
      ctx.response.status = err.status;
    } else if (user) {
      ctx.response.body = response(user.telegramId, `${err}`);
    } else {
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: `${err}` };
    }
  }
}

export type AuthenticatedContext = {
  geolocationClient: GeolocationClient;
  logger: Logger;
  user: User;
  payload: TelegramRequestBody;
};

export function authenticatedContext(ctx: ContextState): AuthenticatedContext {
  if (!ctx.user) {
    throw new Error("no user provided when building authenticated ctx");
  }

  if (!ctx.payload) {
    throw new Error("no payload provided when building authenticated ctx");
  }

  return {
    logger: ctx.logger,
    geolocationClient: ctx.geolocationClient,
    user: ctx.user,
    payload: ctx.payload,
  };
}
