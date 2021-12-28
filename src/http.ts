import { getLogger } from "./logger.ts";

export const request = async (input: Request | URL | string, init?: RequestInit) => {
  const start = Date.now();
  const res = await fetch(input, init);

  const ms = Date.now() - start;
  const path = cleanURL(input);
  getLogger().info(`${init?.method ?? "GET"} ${path} -> ${res.status} (${ms} ms)`);

  return res;
};

// cleanURL simply extracts a loggable enpoint without secret tokens.
const cleanURL = (input: Request | URL | string) => {
  let url = input as URL;
  if (typeof input === "string") {
    url = new URL(input);
  } else if (typeof input === "object") {
    url = new URL((input as Request).url);
  }

  return (url.hostname + url.pathname).split("/").map((x) => x.includes("bot") ? "<BOT_TOKEN>" : x).join("/");
};
