import * as log from "https://deno.land/std@0.100.0/log/mod.ts";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: "{datetime} {levelName} {msg}",
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

export type Logger = log.Logger;
export const getLogger = log.getLogger;
