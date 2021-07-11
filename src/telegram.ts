type TelegramParseMode = "markdown" | "text";
type TelegramAPIMethod = "sendMessage";
type TelegramChatType = "private" | "group";
type TelegramRequestBody = {
  update_id: string;
  message: {
    message_id: string;
    language_code: string;
    from: { id: string };
    text: string;
    chat: {
      id: string;
      title: string;
      type: TelegramChatType;
    };
    location?: { latitude: number; longitude: number };
    date: number;
  };
};
type TelegramResponseBody = {
  method: TelegramAPIMethod;
  chat_id: string;
  text: string;
  parse_mode: TelegramParseMode;
};

function response(chatId: string, text: string): TelegramResponseBody {
  return {
    method: "sendMessage",
    chat_id: chatId,
    text: text,
    parse_mode: "markdown",
  };
}

export { response };
export type { TelegramRequestBody, TelegramResponseBody };
