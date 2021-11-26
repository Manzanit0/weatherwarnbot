import { Client } from "https://deno.land/x/postgres@v0.11.3/mod.ts";
import { QueryObjectResult } from "https://deno.land/x/postgres@v0.11.3/query/query.ts";

export function newClient() {
  return new Client({
    user: Deno.env.get("PGUSER"),
    password: Deno.env.get("PGPASSWORD"),
    database: Deno.env.get("PGDATABASE"),
    hostname: Deno.env.get("PGHOST"),
    port: Deno.env.get("PGPORT"),
  });
}

export async function runQuery<T>(query: string, ...args: string[]) {
  const client = newClient();
  await client.connect();
  const result = await client.queryObject<T>(query, ...args);
  client.end();
  return result;
}

export function unwrapMany<T, K>(mapper: (x: T) => K, r: QueryObjectResult<T>) {
  return unwrapRaw(r).map(mapper);
}

export function unwrapOne<T, K>(mapper: (x: T) => K, r: QueryObjectResult<T>): K | null {
  const unwrapped = unwrapMany(mapper, r);
  if (unwrapped.length > 1) {
    throw new Error(`${unwrapped.length} records returned from query`);
  }

  if (unwrapped === []) {
    return null;
  }

  return unwrapped[0];
}

export function unwrapRaw<T>(r: QueryObjectResult<T>): T[] {
  if (r.rowCount === 0) {
    return [];
  }

  return r.rows;
}

export function unwrapAffectedRecordCount<T>(r: QueryObjectResult<T>): number {
  return r.rowCount ?? -1;
}

export const assertOne = <T>(x: T | null | undefined) => x || throwError("a record was expected, got null | undefined");

const throwError = (m: string) => {
  throw new Error(m);
};
