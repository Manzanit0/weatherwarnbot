import app from "./application.ts";

const port = Number(Deno.env.get("PORT") ?? "8000");
app.state.logger.info(`starting http server on port ${port}`);

await app.listen({ port: port });
