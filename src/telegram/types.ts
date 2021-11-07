// deno-lint-ignore-file camelcase
type TelegramParseMode = "markdown" | "text";
type TelegramAPIMethod = "sendMessage";
type TelegramChatType = "private" | "group" | "supergroup" | "channel";

// https://core.telegram.org/bots/api#making-requests
export type TelegramUpdate = {
  update_id: string;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

// https://core.telegram.org/bots/api#message
export type TelegramMessage = {
  // Unique message identifier inside this chat
  message_id: string;
  // For text messages, the actual UTF-8 text of the message, 0-4096 characters
  text: string;
  // Date the message was sent in Unix time
  date: number;
  //  Sender, empty for messages sent to channels.
  from: TelegramUser;
  // Conversation the message belongs to.
  chat: TelegramChat;
  // Message is a shared location, information about the location.
  location?: TelegramLocation;
};

// https://core.telegram.org/bots/api#callbackquery
export type TelegramCallbackQuery = {
  // Unique identifier for this query
  id: string;
  // Global identifier, uniquely corresponding to the chat to which the
  // message with the callback button was sent
  chat_instance: string;
  // Sender
  from: TelegramUser;
  // Message with the callback button that originated the query.
  message: TelegramMessage;
  // Data associated with the callback button.
  data?: string;
  // Identifier of the message sent via the bot in inline mode, that
  // originated the query.
  inline_message_id?: string;
};

export type TelegramLocation = {
  latitude: number;
  longitude: number;
};

// https://core.telegram.org/bots/api#user
export type TelegramUser = {
  id: string;
  username?: string;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  language_code?: string;
};

// https://core.telegram.org/bots/api#chat
export type TelegramChat = {
  id: string;
  type: TelegramChatType;
  title?: string;
  description?: string;
};

// FIXME: https://core.telegram.org/bots/api#inlinekeyboardmarkup
export type ReplyMarkup = {
  inline_keyboard?: InlineKeyBoard;
  // Fields for custom keyboards
  one_time_keyboard?: boolean;
  keyboard?: KeyBoard;
};

export type InlineKeyBoardElement = {
  text: string;
  callback_data: string;
};

export type InlineKeyBoard = InlineKeyBoardElement[][];

type KeyBoard = string[][];

export type TelegramResponseBody = {
  method: TelegramAPIMethod;
  chat_id: string;
  text: string;
  parse_mode: TelegramParseMode;
  reply_markup?: ReplyMarkup;
};
