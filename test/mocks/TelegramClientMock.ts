import { MessagePayload } from "../../src/telegram/client.ts";
import { TelegramCallbackQuery } from "../../src/telegram/types.ts";

export class TelegramClientMock {
  sendMessage(_chatId: string, _message: string): Promise<void> {
    return Promise.resolve();
  }

  sendComplexMessage(_payload: MessagePayload): Promise<void> {
    return Promise.resolve();
  }

  updateMessage(_messageId: string, _payload: MessagePayload): Promise<void> {
    return Promise.resolve();
  }

  answerCallbackQuery(_query: TelegramCallbackQuery, _message: string): Promise<void> {
    return Promise.resolve();
  }
}
