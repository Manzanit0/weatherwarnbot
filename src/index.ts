import createApp from "./application.ts";
import { start } from "./jobs.ts";
import { getLogger } from "./logger.ts";

// Start weather reminding jobs
start();

// Start bot
const port = Number(Deno.env.get("PORT") ?? "8000");
getLogger().info(`starting http server on port ${port}`);
await createApp().listen({ port: port });
