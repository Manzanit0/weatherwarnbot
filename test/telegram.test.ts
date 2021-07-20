import * as a from "https://deno.land/std@0.102.0/testing/asserts.ts";
import { parseCommand } from "../src/telegram.ts";

// Simple name and function, compact form, but not configurable
Deno.test("simple match", () => {
  const command = parseCommand("/now London, GB");

  a.assertEquals(command.command, "now");
  a.assertEquals(command.city, "London");
  a.assertEquals(command.country, "GB");
});

Deno.test("match with spaces", () => {
  const command = parseCommand("/now San Martín de la Vega, ES");

  a.assertEquals(command.command, "now");
  a.assertEquals(command.city, "San Martín de la Vega");
  a.assertEquals(command.country, "ES");
});

Deno.test("match missing space after comma", () => {
  const command = parseCommand("/now New York,USA");

  a.assertEquals(command.command, "now");
  a.assertEquals(command.city, "New York");
  a.assertEquals(command.country, "USA");
});

Deno.test("tomorrow command", () => {
  const command = parseCommand("/tomorrow New York,USA");

  a.assertEquals(command.command, "tomorrow");
  a.assertEquals(command.city, "New York");
  a.assertEquals(command.country, "USA");
});

Deno.test("help command", () => {
  const command = parseCommand("/help");

  a.assertEquals(command.command, "help");
  a.assertEquals(command.city, undefined);
  a.assertEquals(command.country, undefined);
});

Deno.test("unknown command throws", () => {
  a.assertThrows(() => parseCommand("/foo"));
});

Deno.test("invalid params on command throws", () => {
  a.assertThrows(() => parseCommand("/tomorrow foo bar"));
});

Deno.test("missing params on command throws", () => {
  a.assertThrows(() => parseCommand("/tomorrow new york,    "));
});
