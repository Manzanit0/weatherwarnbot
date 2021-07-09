import { Application, Router } from "https://deno.land/x/oak@v7.7.0/mod.ts";
import { getForecastMessage } from "./forecast.ts";
import { response, TelegramRequestBody } from "./telegram.ts";

const router = new Router();
router.post("/api/telegram", async (context) => {
  try {
    const json = (await context.request.body({ type: "json" })
      .value) as TelegramRequestBody;
    const chatId = json.message.from.id;
    if (!json) {
      context.response.body = response(chatId, "no body");
      return;
    }

    const [command, city, countryCode] = json.message.text.split(" ");
    console.log("received telegram request", {
      command: command,
      city: city,
      countryCode: countryCode,
    });

    if (city && countryCode) {
      console.log(`getting tomorrow's forecast for ${city} (${countryCode})`);
      context.response.body = response(
        chatId,
        await getForecastMessage(city, countryCode.toUpperCase())
      );
    } else {
      console.log("wrong command usage");
      context.response.body = response(
        chatId,
        "Wrong command usage. Required format: '/forecast madrid ES'"
      );
    }
  } catch (error) {
    console.log("error when processing request:", error);

    context.response.body = {
      message: error,
    };
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PORT") ?? "8000");
console.log("starting http server on port", port);
app.listen({ port: port });
