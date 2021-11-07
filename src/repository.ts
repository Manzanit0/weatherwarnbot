// deno-lint-ignore-file camelcase
import * as R from "https://raw.githubusercontent.com/selfrefactor/rambda/master/dist/rambda.esm.js";
import { runQuery, unwrapAffectedRecordCount, unwrapMany, unwrapOne } from "./database.ts";

// User Repository

type DbUser = {
  "id": string;
  "telegram_chat_id": string;
  "username"?: string;
  "first_name"?: string;
  "last_name"?: string;
  "language_code": string;
  "is_bot": boolean;
};

export type User = {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode: string;
  isBot: boolean;
};

export const findUser = (telegramId: string) =>
  runQuery<DbUser>(`SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id = '${telegramId}'`)
    .then(unwrapMaybeOneUser);

export type CreateUserParams = {
  telegramId: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_bot?: boolean;
};

export const createUser = (params: CreateUserParams) =>
  runQuery<DbUser>(`INSERT INTO users
    (telegram_chat_id, username, first_name, last_name, language_code, is_bot)
    VALUES (
      '${params.telegramId}',
      '${params.username}',
      '${params.first_name}',
      '${params.last_name}',
      '${params.language_code ?? "en"}',
      '${params.is_bot ?? false}')
    RETURNING *`)
    .then(unwrapOneUser);

export type UpdateUserParams = {
  telegramId: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_bot?: boolean;
};

export const updateUser = (params: UpdateUserParams) =>
  runQuery<DbUser>(`UPDATE users SET
      username='${params.username}',
      first_name='${params.first_name}',
      last_name='${params.last_name}',
      language_code='${params.language_code ?? "en"}',
      is_bot='${params.is_bot ?? false}'
    WHERE telegram_chat_id='${params.telegramId}'
    RETURNING *`)
    .then(unwrapOneUser);

// Location Repository

export type Coordinates = { latitude: number; longitude: number };

export type UserLocation = {
  id: string;
  userId: string;
  name: string;
  coordinates: Coordinates;
};

type DbUserLocation = {
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
  const positionstack = JSON.stringify(params.positionstack || {});
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

export const deleteLocationById = (id: string) =>
  runQuery<DbUserLocation>(`DELETE FROM user_locations WHERE id = '${id}'`)
    .then(unwrapAffectedRecordCount);

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

const toUserLocation = (x: DbUserLocation) => ({
  id: x.id,
  userId: x.user_id,
  name: x.name,
  coordinates: decodeCoordinates(x.coordinates),
} as UserLocation);

const toUser = (x: DbUser) => ({
  id: x.id,
  username: x.username,
  telegramId: x.telegram_chat_id,
  firstName: x.first_name,
  lastName: x.last_name,
  languageCode: x.language_code,
  isBot: x.is_bot,
} as User);

const assertOne = <T>(x: T | null | undefined) => x || throwError("a record was expected, got null | undefined");

const unwrapMaybeOneUser: () => User | null = R.curry(unwrapOne)(toUser);

const unwrapOneUser: () => User = R.compose(assertOne, unwrapMaybeOneUser);

const unwrapLocations: () => UserLocation[] = R.curry(unwrapMany)(toUserLocation);

const unwrapMaybeOneLocation: () => UserLocation | null = R.curry(unwrapOne)(toUserLocation);

const unwrapOneLocation: () => UserLocation = R.compose(assertOne, unwrapMaybeOneLocation);

const throwError = (m: string) => {
  throw new Error(m);
};
