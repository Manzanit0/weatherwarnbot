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

type TelegramCommand = {
  command: "now" | "tomorrow" | "help";
  city?: string;
  country?: string;
};

function parseCommand(command: string): TelegramCommand {
  if (command.includes("/help")) {
    return { command: "help" };
  }

  const regex = /\/(?<command>\w+) (?<city>.+),\s*(?<country>[a-zA-Z0-9_-]+)/;
  const match = command.match(regex);

  if (!match || !match.groups) {
    throw new Error("invalid command: wrong format");
  }

  if (match.groups.command == "now" || match.groups.command == "tomorrow") {
    return {
      command: match.groups.command,
      city: match.groups.city,
      country: match.groups.country,
    };
  } else {
    throw new Error("unknown command");
  }
}

export { response, parseCommand };
export type { TelegramRequestBody, TelegramResponseBody };
