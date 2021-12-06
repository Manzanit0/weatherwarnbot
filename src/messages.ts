import { Forecast } from "./forecast.ts";
import { findLocationByNameAndUser, UserLocation } from "./repository/locations.ts";
import { User } from "./repository/users.ts";
import { InlineKeyBoard } from "./telegram/types.ts";
import {
  bookmarkLocationInlineButton,
  disableNotificationsInlineButton,
  enableNotificationsInlineButton,
  TelegramCommand,
} from "./telegram/utils.ts";

export const retrospectiveMessage = (yday: Forecast, today: Forecast) => {
  const UNIX_DT_TRANSFORM_RATIO = 1000;
  const ydayString = new Date(yday.dateUnixTimestamp * UNIX_DT_TRANSFORM_RATIO).toDateString();
  const todayString = new Date(today.dateUnixTimestamp * UNIX_DT_TRANSFORM_RATIO).toDateString();

  let temperatureTLDR: string;
  if (today.minimumTemperature < yday.minimumTemperature) {
    if (today.minimumTemperature > 30) {
      temperatureTLDR = "Parece que mejora el tema, ya no nos vamos a achicharrar.";
    } else if (today.minimumTemperature > 20) {
      temperatureTLDR = "Va a hacer buen tiempo, igual hasta con manga corta te apañas.";
    } else if (today.minimumTemperature > 10) {
      temperatureTLDR = "Vajan las temperaturas, cogejete una rebequita.";
    } else {
      temperatureTLDR = "Va a hacer un frío que pela... no salgas descalzo.";
    }
  } else if (today.maxTemperature > yday.minimumTemperature) {
    if (today.maxTemperature > 30) {
      temperatureTLDR = "Sube el lorenzo, preparate la botella de agua, que hoy va a pegar el calor.";
    } else if (today.maxTemperature > 20) {
      temperatureTLDR = "Tiene pinta de que mejora el tiempo, ni mucho frío ni mucho calor";
    } else if (today.maxTemperature > 10) {
      temperatureTLDR = "Suben un poco las temperaturas... pero no te dejes el abrigo en casa.";
    } else {
      temperatureTLDR = "Ojito, que aunque mejora el tiempo hoy, sigue haciendo un frío de la leche.";
    }
  } else {
    temperatureTLDR = "Hoy más o menos puedes esperar las mismas temperaturas que ayer.";
  }

  const beaufortTLDR = beaufortDescription(today.windSpeed);

  return `🚩 ${today.location}
- - - - - - - - - - - - - - - - - - - - - -
📅 ${ydayString} → ${todayString}

TLDR:
🏷 ${yday.description} → ${today.description}

Temperaturas:
📄 ${temperatureTLDR}
❄️ ${yday.minimumTemperature}°C → ${today.minimumTemperature}°C
🔥 ${today.maxTemperature}ºC → ${today.maxTemperature}ºC

Viento:
📄 ${beaufortTLDR}
💨 ${yday.windSpeed} m/s → ${today.windSpeed} m/s

Humedad:
💧 ${yday.humidity}%
- - - - - - - - - - - - - - - - - - - - - -
`;
};

export const simpleMessage = (forecast: Forecast) => {
  const UNIX_DT_TRANSFORM_RATIO = 1000;
  const dateString = new Date(forecast.dateUnixTimestamp * UNIX_DT_TRANSFORM_RATIO).toDateString();

  return `🚩 ${forecast.location}
    - - - - - - - - - - - - - - - - - - - - - -
    🕘 ${dateString}
    🌀 ${forecast.description}
    🔰 ${forecast.minimumTemperature}°C - ${forecast.maxTemperature}ºC
    💧 ${forecast.humidity}%
    💨 ${forecast.windSpeed} m/s
    - - - - - - - - - - - - - - - - - - - - - -
    `;
};

export const buildForecastKeyboard = async (user: User, c: TelegramCommand): Promise<InlineKeyBoard> => {
  const location = await findLocationByNameAndUser(c.city!, user.id);
  if (!location) {
    const locationName = `${c.city},${c.country}`;
    return [[bookmarkLocationInlineButton(locationName)], [enableNotificationsInlineButton(locationName)]];
  }

  return buildForecastKeyboardForLocation(location);
};

export const buildForecastKeyboardForLocation = (location: UserLocation): InlineKeyBoard => {
  if (location && location.notificationsEnabled === false) {
    return [[enableNotificationsInlineButton(location.id)]];
  }

  return [[disableNotificationsInlineButton(location.id)]];
};

export const helpText = `
Los siguientes comandos están disponibles para su uso:

✔️ /now London, GB
Devuelve el tiempo para la ciudad en estos momentos.

✔️ /tomorrow Madrid, ES
Devuelve el tiempo para la ciudad mañana.

✔️ /settings
Permite gestionar las localidades guardadas.

✔️ /help
imprime esta ayuda.

Recuerda que si me estás llamando dentro de un group, seguramente tengas
que usar el sufijo con mi nombre: /help@weatherwarnbot.

Tambien puedes probar a enviarme una localización.
        `;

// Synthesises the Beaufort scale.
// @see https://en.wikipedia.org/wiki/Beaufort_scale
const beaufortDescription = (windSpeed: number) => {
  let windTLDR: string;
  if (windSpeed <= 0.5) {
    windTLDR = "Ni gota de aire, chacho!";
  } else if (windSpeed <= 3.3) {
    windTLDR = "Brisa leve - A lo sumo se oirá el crujir de las hojas.";
  } else if (windSpeed <= 5.5) {
    windTLDR = "Brisa leve - Las ramillas más pequeñas de los arboles se moveran, pero poco más.";
  } else if (windSpeed <= 7.9) {
    windTLDR = "Brisa moderada - Es posible que el polvo del suelo se levante.";
  } else if (windSpeed <= 10.7) {
    windTLDR = "Brisa moderada - Los arboles más pequeños se van a mover";
  } else if (windSpeed <= 13.8) {
    windTLDR = "Brisa fuerte - Suficiente como para que sea incomodo usar paraguas.";
  } else if (windSpeed <= 17.1) {
    windTLDR = "Viento fuerte - Va a ser incomodo pasear.";
  } else if (windSpeed <= 20.7) {
    windTLDR =
      "Viento muy fuerte - No se puede caminar con este viento; las ramas más pequeñas de los árboles se romperan.";
  } else if (windSpeed <= 24.5) {
    windTLDR = "Viento muy fuerte - Es peligroso salir, hará suficiente viento para arrancar tejas de las casas";
  } else {
    windTLDR =
      "Borrasca - Quédate en casa y consulta las noticias: suficiente para arrancar árboles del suelo o dañar estructuras.";
  }

  return windTLDR;
};
