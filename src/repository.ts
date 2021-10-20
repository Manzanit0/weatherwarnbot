// deno-lint-ignore-file camelcase
import * as R from "https://raw.githubusercontent.com/selfrefactor/rambda/master/dist/rambda.esm.js";
import { runQuery, unwrapMany, unwrapOne } from "./database.ts";

// User Repository

export type User = {
  id: string;
  telegram_chat_id: string;
};

export function findUser(telegramId: string): Promise<User | null> {
  const query = `SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id = '${telegramId}'`;
  return runQuery<User>(query).then(unwrapOneUser);
}

export function createUser({ telegramId }: { telegramId: string }): Promise<User> {
  const query = `INSERT INTO users (telegram_chat_id) VALUES ('${telegramId}') RETURNING id, telegram_chat_id`;
  console.log(query);
  return runQuery<User>(query).then(unwrapOneUser);
}

// Location Repository

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
  // It doesn't matter because we're just going to store it as a json blob.
  positionstack?: unknown;
};

export function createUserLocation(params: CreateLocationParams): Promise<UserLocation> {
  const name = params.name || "";
  const positionstack = JSON.stringify(params.positionstack);
  const coordinates = encodeCoordinates(params.coordinates);

  const query = `
     INSERT INTO user_locations (user_id, name, coordinates, positionstack_response)
     VALUES ('${params.user_id}', '${name}', ${coordinates}, '${positionstack}')
     RETURNING id, user_id, name, coordinates`;

  return runQuery<DbUserLocation>(query).then(unwrapOneLocation);
}

export function findUserLocation(name: string, userId: string): Promise<UserLocation | null> {
  const query = `SELECT id, user_id, name, coordinates
                 FROM user_locations
                 WHERE LOWER(name) = LOWER('${name}')
                 AND user_id = '${userId}'`;

  return runQuery<DbUserLocation>(query).then(unwrapOneLocation);
}

export function listUserLocations(userId: string): Promise<UserLocation[]> {
  const query = `SELECT id, user_id, name, coordinates FROM user_locations WHERE user_id = '${userId}'`;
  return runQuery<DbUserLocation>(query).then(unwrapLocations);
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

const toUserLocation = (x: DbUserLocation): UserLocation => ({
  ...x,
  coordinates: decodeCoordinates(x.coordinates),
});

const unwrapOneUser = R.curry(unwrapOne)(R.identity);

const unwrapLocations = R.curry(unwrapMany)(toUserLocation);

const unwrapOneLocation = R.curry(unwrapOne)(toUserLocation);
