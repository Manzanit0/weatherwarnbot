// deno-lint-ignore-file camelcase
import { ReplyMarkup, TelegramCallbackQuery } from "./types.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const apiHost = `https://api.telegram.org/bot${botToken}`;

export type MessagePayload = {
  chat_id: string;
  text: string;
  reply_markup?: ReplyMarkup;
};

async function answerCallbackQuery(query: TelegramCallbackQuery, message: string) {
  const req = await fetch(`${apiHost}/answerCallbackQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callback_query_id: query.id,
      text: message,
    }),
  });

  if (!req.ok) {
    throw new Error(`failed to answer callback_query: status=${req.status}`);
  }
}

async function sendComplexMessage(payload: MessagePayload) {
  const req = await fetch(`${apiHost}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!req.ok) {
    throw new Error(`failed to to sendMessage: status=${req.status}`);
  }
}

function sendMessage(chatId: string, message: string) {
  return sendComplexMessage({ chat_id: chatId, text: message });
}

async function updateMessage(messageId: string, payload: MessagePayload) {
  const req = await fetch(`${apiHost}/editMessageText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, message_id: messageId }),
  });

  if (!req.ok) {
    throw new Error(`failed to to sendMessage: status=${req.status}`);
  }
}

export interface TelegramClient {
  sendMessage(chatId: string, message: string): Promise<void>;
  sendComplexMessage(payload: MessagePayload): Promise<void>;
  updateMessage(messageId: string, payload: MessagePayload): Promise<void>;
  answerCallbackQuery(query: TelegramCallbackQuery, message: string): Promise<void>;
}

export const telegramClient: TelegramClient = {
  answerCallbackQuery,
  sendMessage,
  sendComplexMessage,
  updateMessage,
};
