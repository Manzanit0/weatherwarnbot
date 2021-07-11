type TelegramParseMode = "markdown" | "text";
type TelegramAPIMethod = "sendMessage";
type TelegramRequestBody = { message: { from: { id: string }; text: string } };
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
