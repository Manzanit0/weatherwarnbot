// deno-lint-ignore-file
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

type TelegramParseMode = "markdown" | "text";
type TelegramAPIMethod = "sendMessage";
type TelegramChatType = "private" | "group";

// Information from the user sending the message.
type TelegramFrom = {
  id: string;
  username: string;
  is_bot: boolean;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

type TelegramMessage = {
  message_id: string;
  text: string;
  date: number;
  from: TelegramFrom;
  chat: {
    id: string;
    type: TelegramChatType;
  };
  location?: { latitude: number; longitude: number };
  language_code?: string;
};

export type TelegramRequestBody = {
  update_id: string;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramFrom;
    message: TelegramMessage;
    chat_instance: string;
    data: string;
  };
};

type InlineKeyBoardElement = {
  text: string;
  callback_data: string;
};

type InlineKeyBoard = InlineKeyBoardElement[][];

type KeyBoard = string[][];

type ReplyMarkup = {
  inline_keyboard?: InlineKeyBoard;
  // Fields for custom keyboards
  one_time_keyboard?: boolean;
  keyboard?: KeyBoard;
};

export type TelegramResponseBody = {
  method: TelegramAPIMethod;
  chat_id: string;
  text: string;
  parse_mode: TelegramParseMode;
  reply_markup?: ReplyMarkup;
};

export function getChatId(body: TelegramRequestBody) {
  if (body.callback_query) {
    return body.callback_query.message?.chat?.id;
  } else if (body.message) {
    return body.message.chat?.id;
  } else {
    return null;
  }
}

export function response(chatId: string, text: string): TelegramResponseBody {
  return {
    method: "sendMessage",
    chat_id: chatId,
    text: text,
    parse_mode: "markdown",
  };
}

export async function answerCallbackQuery({ callback_query: query }: TelegramRequestBody, message: string) {
  const req = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callback_query_id: query!.id,
      text: message,
    }),
  });

  if (!req.ok) {
    throw new Error(`failed to answer callback_query: status=${req.status}`);
  }
}

type MessagePayload = {
  chat_id: string;
  text: string;
  reply_markup?: ReplyMarkup;
};

export async function sendComplexMessage(payload: MessagePayload) {
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

export async function updateMessage(messageId: string, payload: MessagePayload) {
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

export async function sendMessage(chatId: string, message: string) {
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

export function withLocationInlineMenu(res: TelegramResponseBody, locationName: string): TelegramResponseBody {
  return {
    ...res,
    reply_markup: {
      inline_keyboard: [
        [
          bookmarkLocationInlineButton(locationName),
        ],
        [
          enableNotificationsInlineButton,
        ],
      ],
    },
  };
}

export const enableNotificationsInlineButton = {
  text: "📬 Enable notifications",
  callback_data: "location:enable_notification",
};

export const bookmarkLocationInlineButton = (locationName: string) => ({
  text: "📌 Bookmark Location",
  callback_data: `location:bookmark:${locationName}`,
});

export function withSettingsInlineMenu(res: TelegramResponseBody): TelegramResponseBody {
  return {
    ...res,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📌 Saved locations",
            callback_data: "settings:locations",
          },
          {
            text: "📬 Notifications",
            callback_data: "settings:notifications",
          },
        ],
        [
          {
            text: "❌ Delete my data",
            callback_data: "settings:delete",
          },
        ],
      ],
    },
  };
}

export function withForecastRequestInlineMenu(
  res: TelegramResponseBody,
  command: TelegramWeatherRequestCommand,
  locations: [string, string][],
): TelegramResponseBody {
  return {
    ...res,
    reply_markup: {
      inline_keyboard: locations.map((
        x,
      ) => ([{ text: x[1], callback_data: `forecast:${command}:${x[0]}` }])),
    },
  };
}

export function withLocationsSettingsKeyboard(
  res: TelegramResponseBody,
  locations: [string, string][],
): TelegramResponseBody {
  return {
    ...res,
    reply_markup: {
      one_time_keyboard: true,
      inline_keyboard: locations.map((x) => ([{ text: x[1], callback_data: x[0] }])),
    },
  };
}

export function withBackToSettingsInlineButton(res: TelegramResponseBody): TelegramResponseBody {
  if (!res.reply_markup?.inline_keyboard) {
    res.reply_markup = {
      one_time_keyboard: true,
      inline_keyboard: [],
    };
  }

  return {
    ...res,
    reply_markup: {
      ...res.reply_markup,
      inline_keyboard: res.reply_markup?.inline_keyboard?.concat([[{
        text: "« Back to Settings",
        callback_data: "settings:back",
      }]]),
    },
  };
}

export function withInlineKeyboard(res: TelegramResponseBody, keyboard: InlineKeyBoard): TelegramResponseBody {
  return {
    ...res,
    reply_markup: {
      ...res.reply_markup,
      inline_keyboard: keyboard,
    },
  };
}

export function withLocationsKeyboard(res: TelegramResponseBody, locations: string[]): TelegramResponseBody {
  return {
    ...res,
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [locations],
    },
  };
}

type TelegramWeatherRequestCommand = "now" | "tomorrow";

type TelegramCommand = {
  command: TelegramWeatherRequestCommand | "help" | "settings";
  city?: string;
  country?: string;
};

export function parseCommand(command: string): TelegramCommand {
  if (command.includes("/help")) {
    return { command: "help" };
  }

  if (command.includes("/settings")) {
    return { command: "settings" };
  }

  // https://regex101.com/r/g4ajjf/2
  const regex = /^\/(?<command>\w+)(?:@?(?<botname>\w*))?\s*(?:(?<city>.+),\s*(?<country>[a-zA-Z0-9_-]+))?$/;
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
