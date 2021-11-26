import { Forecast } from "./forecast.ts";

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

  // TODO: synthesise this into a func: https://en.wikipedia.org/wiki/Beaufort_scale
  let windTLDR: string;
  if (today.windSpeed <= 0.5) {
    windTLDR = "Ni gota de aire, chacho!";
  } else if (today.windSpeed <= 5.5) {
    windTLDR = "Parece que va a haber una brisilla muy ligera, pero vamos, bien.";
  } else if (today.windSpeed <= 10.7) {
    windTLDR = "Va a hacer vientecillo... Si tienes cometa, sácala.";
  } else if (today.windSpeed <= 13.8) {
    windTLDR = "No va a hacer día de paseo, el viento va a ser molesto.";
  } else if (today.windSpeed <= 17.1) {
    windTLDR = "Va a hacer tanto viento que está en el límite de mejor quedarse en casa.";
  } else {
    windTLDR = "Quédate en casa, va a haber DEMASIADO viento, puede que se caigan arboles.";
  }

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
📄 ${windTLDR}
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
