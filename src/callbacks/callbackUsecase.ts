import { AuthenticatedContext } from "../middleware.ts";
import { TelegramRequestBody } from "../telegram.ts";

export interface CallbackUsecase {
  isValid(body: TelegramRequestBody): boolean;
  handle(ctx: AuthenticatedContext): Promise<void> | void;
}

export const findValid = (usecases: CallbackUsecase[], body: TelegramRequestBody) =>
  usecases.find((x) => x.isValid(body));
