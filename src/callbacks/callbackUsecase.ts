import { AuthenticatedContext } from "../middleware.ts";
import { TelegramUpdate } from "../telegram.ts";

export interface CallbackUsecase {
  isValid(body: TelegramUpdate): boolean;
  handle(ctx: AuthenticatedContext): Promise<void> | void;
}

export const findValid = (usecases: CallbackUsecase[], body: TelegramUpdate) => usecases.find((x) => x.isValid(body));
