import { AuthenticatedContext } from "../middleware.ts";
import { TelegramCallbackQuery } from "../telegram.ts";

export interface CallbackUsecase {
  isValid(callback: TelegramCallbackQuery): boolean;
  handle(ctx: AuthenticatedContext, callback: TelegramCallbackQuery): Promise<void> | void;
}

export const findValid = (usecases: CallbackUsecase[], callback: TelegramCallbackQuery) =>
  usecases.find((x) => x.isValid(callback));
