import createApp from "./application.ts";
import { getLogger } from "./logger.ts";

const app = await createApp();

const port = Number(Deno.env.get("PORT") ?? "8000");
getLogger().info(`starting http server on port ${port}`);

await app.listen({ port: port });
