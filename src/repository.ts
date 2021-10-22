// deno-lint-ignore-file camelcase
import * as R from "https://raw.githubusercontent.com/selfrefactor/rambda/master/dist/rambda.esm.js";
import { runQuery, unwrapMany, unwrapOne } from "./database.ts";

// User Repository

export type User = {
  id: string;
  telegram_chat_id: string;
};

export const findUser = (telegramId: string) =>
  runQuery<User>(`SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id = '${telegramId}'`)
    .then(unwrapMaybeOneUser);

export const createUser = ({ telegramId }: { telegramId: string }) =>
  runQuery<User>(`INSERT INTO users (telegram_chat_id) VALUES ('${telegramId}') RETURNING id, telegram_chat_id`)
    .then(unwrapOneUser);

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

export const createUserLocation = (params: CreateLocationParams) => {
  const name = params.name || "";
  const positionstack = JSON.stringify(params.positionstack);
  const coordinates = encodeCoordinates(params.coordinates);

  const query = `
     INSERT INTO user_locations (user_id, name, coordinates, positionstack_response)
     VALUES ('${params.user_id}', '${name}', ${coordinates}, '${positionstack}')
     RETURNING id, user_id, name, coordinates`;

  return runQuery<DbUserLocation>(query).then(unwrapOneLocation);
};

export const findLocationByNameAndUser = (name: string, userId: string) =>
  runQuery<DbUserLocation>(
    `SELECT id, user_id, name, coordinates FROM user_locations WHERE LOWER(name) = LOWER('${name}') AND user_id = '${userId}'`,
  ).then(unwrapMaybeOneLocation);

export const findLocationById = (id: string) =>
  runQuery<DbUserLocation>(`SELECT id, user_id, name, coordinates FROM user_locations WHERE id = '${id}'`)
    .then(unwrapMaybeOneLocation);

export const listLocations = (userId: string) =>
  runQuery<DbUserLocation>(`SELECT id, user_id, name, coordinates FROM user_locations WHERE user_id = '${userId}'`)
    .then(unwrapLocations);

const decodeCoordinates = (coordinates: string) => {
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
  } as Coordinates;
};

const encodeCoordinates = (coordinates: Coordinates) => `(${coordinates.latitude}, ${coordinates.longitude})`;

const toUserLocation = (x: DbUserLocation) => ({ ...x, coordinates: decodeCoordinates(x.coordinates) } as UserLocation);

const assertOne = <T>(x: T | null | undefined) => x || throwError("a record was expected, got null | undefined");

const unwrapMaybeOneUser: () => User | null = R.curry(unwrapOne)(R.identity);

const unwrapOneUser: () => User = R.compose(assertOne, unwrapMaybeOneUser);

const unwrapLocations: () => UserLocation[] = R.curry(unwrapMany)(toUserLocation);

const unwrapMaybeOneLocation: () => UserLocation | null = R.curry(unwrapOne)(toUserLocation);

const unwrapOneLocation: () => UserLocation = R.compose(assertOne, unwrapMaybeOneLocation);

const throwError = (m: string) => {
  throw new Error(m);
};
