// deno-lint-ignore-file camelcase
import { InlineKeyBoard, TelegramResponseBody, TelegramUpdate } from "./types.ts";

export function getChatId(update: TelegramUpdate) {
  if (update.callback_query) {
    return update.callback_query.message?.chat?.id;
  } else if (update.message) {
    return update.message.chat?.id;
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

  // https://regex101.com/r/g4ajjf/3
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
