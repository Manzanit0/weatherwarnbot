import { Client } from "https://deno.land/x/postgres@v0.11.3/mod.ts";

const client = new Client({
  user: Deno.env.get("PGUSER"),
  password: Deno.env.get("PGPASSWORD"),
  database: Deno.env.get("PGDATABASE"),
  hostname: Deno.env.get("PGHOST"),
  port: Deno.env.get("PGPORT"),
});

type User = {
  id: string;
  // deno-lint-ignore camelcase
  telegram_chat_id: string;
};

export async function findUser(telegramId: string) {
  const object = await runQuery<User>(
    "SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id = $1",
    telegramId,
  );

  if (object.rowCount == 0) {
    return null;
  }

  if (object.rowCount && object.rowCount > 1) {
    throw new Error('found multiple contacts by the same "telegram_chat_id"');
  }

  return object.rows[0];
}

export async function createUser({ telegramId }: { telegramId: string }) {
  const object = await runQuery<User>(
    "INSERT INTO users (telegram_chat_id) VALUES ($1) RETURNING id, telegram_chat_id",
    telegramId,
  );

  if (object.rowCount == 0) {
    return null;
  }

  if (object.rowCount && object.rowCount > 1) {
    throw new Error('found multiple contacts by the same "telegram_chat_id"');
  }

  return object.rows[0];
}

async function runQuery<T>(query: string, ...args: string[]) {
  await client.connect();
  const result = await client.queryObject<T>(query, ...args);
  client.end();
  return result;
}
