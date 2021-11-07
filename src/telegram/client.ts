// deno-lint-ignore-file camelcase
import { ReplyMarkup, TelegramCallbackQuery } from "./types.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

type MessagePayload = {
  chat_id: string;
  text: string;
  reply_markup?: ReplyMarkup;
};

async function answerCallbackQuery(query: TelegramCallbackQuery, message: string) {
  const req = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
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
  const req = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

async function updateMessage(messageId: string, payload: MessagePayload) {
  const req = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
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

async function sendMessage(chatId: string, message: string) {
  const req = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
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
  answerCallbackQuery: answerCallbackQuery,
  sendMessage: sendMessage,
  sendComplexMessage: sendComplexMessage,
  updateMessage: updateMessage,
};
