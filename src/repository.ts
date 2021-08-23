// deno-lint-ignore-file camelcase
import { Client } from "https://deno.land/x/postgres@v0.11.3/mod.ts";

const client = new Client({
  user: Deno.env.get("PGUSER"),
  password: Deno.env.get("PGPASSWORD"),
  database: Deno.env.get("PGDATABASE"),
  hostname: Deno.env.get("PGHOST"),
  port: Deno.env.get("PGPORT"),
});

export type User = {
  id: string;
  telegram_chat_id: string;
};

export async function findUser(telegramId: string) {
  const result = await runQuery<User>(
    "SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id = $1",
    telegramId,
  );

  if (result.rowCount == 0) {
    return null;
  }

  if (result.rowCount && result.rowCount > 1) {
    throw new Error('found multiple contacts by the same "telegram_chat_id"');
  }

  return result.rows[0];
}

export async function createUser({ telegramId }: { telegramId: string }) {
  const result = await runQuery<User>(
    "INSERT INTO users (telegram_chat_id) VALUES ($1) RETURNING id, telegram_chat_id",
    telegramId,
  );

  if (result.rowCount != 1 || !result.rows[0]) {
    throw new Error("unable to create user");
  }

  return result.rows[0];
}

export type Coordinates = { latitude: number; longitude: number };

export type UserLocation = {
  id: string;
  user_id: string;
  name?: string;
  coordinates: Coordinates;
};

export type DbUserLocation = {
  id: string;
  user_id: string;
  name?: string;
  coordinates: string;
};

type CreateLocationParams = {
  user_id: string;
  name?: string;
  coordinates: Coordinates;
};

export async function createUserLocation(
  params: CreateLocationParams,
): Promise<UserLocation> {
  const result = await runQuery<DbUserLocation>(
    "INSERT INTO user_locations (user_id, name, coordinates) VALUES ($1, $2, $3) RETURNING id, user_id, name, coordinates",
    params.user_id,
    params.name || "",
    encodeCoordinates(params.coordinates),
  );

  if (result.rowCount != 1 || !result.rows[0]) {
    throw new Error("unable to create user_location");
  }

  return {
    ...result.rows[0],
    coordinates: decodeCoordinates(result.rows[0].coordinates),
  };
}

async function runQuery<T>(query: string, ...args: string[]) {
  await client.connect();
  const result = await client.queryObject<T>(query, ...args);
  client.end();
  return result;
}

function decodeCoordinates(coordinates: string): Coordinates {
  const result = coordinates.match(
    /^\((?<latitude>[\.\-\d]*),(?<longitude>[\.\-\d]*)\)$/,
  );

  if (
    !result || !result.groups || !result.groups.latitude ||
    !result.groups.longitude
  ) {
    throw new Error("invalid input");
  }

  return {
    latitude: Number(result.groups.latitude),
    longitude: Number(result.groups.longitude),
  };
}

function encodeCoordinates(coordinates: Coordinates) {
  return `(${coordinates.latitude}, ${coordinates.longitude})`;
}
