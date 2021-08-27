import * as log from "https://deno.land/std@0.100.0/log/mod.ts";

export type Logger = log.Logger;

export async function getLogger() {
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

  return log.getLogger();
}
