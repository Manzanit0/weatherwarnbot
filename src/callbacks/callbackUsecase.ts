import { Logger } from "../logger.ts";
import { AuthenticatedContext } from "../middleware.ts";
import { GeolocationClient } from "../positionstack.ts";
import { User } from "../repository.ts";
import { TelegramCallbackQuery } from "../telegram.ts";

export interface CallbackUsecase {
  isValid(callback: TelegramCallbackQuery): boolean;
  handle(ctx: CallbackContext): Promise<void> | void;
}

export const findValid = (usecases: CallbackUsecase[], body: TelegramCallbackQuery) =>
  usecases.find((x) => x.isValid(body));

export type CallbackContext = {
  geolocationClient: GeolocationClient;
  logger: Logger;
  user: User;
  callback: TelegramCallbackQuery;
};

export const callbackContext = (
  ctx: AuthenticatedContext,
) => ({ ...ctx, callback: ctx.payload.callback_query! } as CallbackContext);
