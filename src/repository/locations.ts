// deno-lint-ignore-file camelcase
import * as R from "https://raw.githubusercontent.com/selfrefactor/rambda/master/dist/rambda.esm.js";
import { assertOne, runQuery, unwrapAffectedRecordCount, unwrapMany, unwrapOne } from "./database.ts";

export type Coordinates = { latitude: number; longitude: number };

export type UserLocation = {
  id: string;
  userId: string;
  name: string;
  coordinates: Coordinates;
  notificationsEnabled: boolean;
};

type DbUserLocation = {
  id: string;
  user_id: string;
  name?: string;
  coordinates: string;
  notifications_enabled: boolean;
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

const locationFields = "id, user_id, name, coordinates, notifications_enabled";

export const findLocationByNameAndUser = (name: string, userId: string) =>
  runQuery<DbUserLocation>(
    `SELECT ${locationFields} FROM user_locations WHERE LOWER(name) = LOWER('${name}') AND user_id = '${userId}'`,
  ).then(unwrapMaybeOneLocation);

export const findLocationById = (id: string) =>
  runQuery<DbUserLocation>(
    `SELECT ${locationFields} FROM user_locations WHERE id = '${id}'`,
  ).then(unwrapMaybeOneLocation);

export const listLocations = (userId: string) =>
  runQuery<DbUserLocation>(`SELECT ${locationFields} FROM user_locations WHERE user_id = '${userId}'`)
    .then(unwrapLocations);

export const deleteLocationById = (id: string) =>
  runQuery<DbUserLocation>(`DELETE FROM user_locations WHERE id = '${id}'`)
    .then(unwrapAffectedRecordCount);

export const enableNotifications = (id: string) =>
  runQuery<DbUserLocation>(`UPDATE user_locations set notifications_enabled=true WHERE id = '${id}'`)
    .then(unwrapAffectedRecordCount);

export const disableNotifications = (id: string) =>
  runQuery<DbUserLocation>(`UPDATE user_locations set notifications_enabled=false WHERE id = '${id}'`)
    .then(unwrapAffectedRecordCount);

const toUserLocation = (x: DbUserLocation) => ({
  id: x.id,
  userId: x.user_id,
  name: x.name,
  notificationsEnabled: x.notifications_enabled,
  coordinates: decodeCoordinates(x.coordinates),
} as UserLocation);

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

const unwrapLocations: () => UserLocation[] = R.curry(unwrapMany)(toUserLocation);

const unwrapMaybeOneLocation: () => UserLocation | null = R.curry(unwrapOne)(toUserLocation);

const unwrapOneLocation: () => UserLocation = R.compose(assertOne, unwrapMaybeOneLocation);
