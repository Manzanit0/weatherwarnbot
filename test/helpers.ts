import { getLogger } from "../src/logger.ts";
import { newClient } from "../src/repository/database.ts";

export const setup = async () => {
  // these values can be gathered in the docker-compose.yml
  // for the tests to pass, run `make bootstrap`.
  Deno.env.set("PGUSER", "root");
  Deno.env.set("PGPASSWORD", "password");
  Deno.env.set("PGDATABASE", "weatherbot_db");
  Deno.env.set("PGHOST", "localhost");
  Deno.env.set("PGPORT", "5431");

  // Stop from printing logs in test runner by setting level to critical.
  getLogger().level = 50;
  await nukeDB();
};

// TODO: In order to avoid having to nuke the DB in each test, we need to push
// the repository to the boundary to replace it with a in-memory one.
export const nukeDB = async () => {
  const c = newClient();
  await c.connect();
  await c.queryObject("DELETE FROM user_locations;");
  await c.queryObject("DELETE FROM users;");
  await c.end();
};
