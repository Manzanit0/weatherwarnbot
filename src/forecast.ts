import * as api from "./openweathermap.ts";
import { WeatherClient } from "./openweathermap.ts";

export interface Forecast {
  location?: string;
  coordinates?: { latitude: number; longitude: number };
  isClear: boolean;
  description: string;
  minimumTemperature: number;
  maxTemperature: number;
  humidity: number;
  windSpeed: number;
  dateUnixTimestamp: number;
}

export enum Day {
  TODAY,
  TOMORROW,
  IN_TWO_DAYS,
  IN_THREE_DAYS,
  IN_FOUR_DAYS,
  IN_FIVE_DAYS,
}

const fetchWeatherByCoordinatesWithClient = (c: WeatherClient) =>
  (lat: number, lon: number, when: Day = Day.TODAY) =>
    c.requestDailyForecast({ latitude: lat, longitude: lon })
      .then((x) => mapForecastData(x.list[when], "", "N/a"));

const fetchYesterdayWeatherByCoordinatesWithClient = (c: WeatherClient) =>
  (lat: number, lon: number) =>
    c.requestHistoricForecast({ latitude: lat, longitude: lon })
      .then(mapHistoricForecastData);

export const newForecastClient = (c: WeatherClient) => ({
  fetchWeatherByCoordinates: fetchWeatherByCoordinatesWithClient(c),
  fetchYesterdayWeatherByCoordinates: fetchYesterdayWeatherByCoordinatesWithClient(c),
});

export const buildRetrospectiveForecastMessage = (yday: Forecast, today: Forecast) => {
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

export const buildForecastMessage = (forecast: Forecast) => {
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

const mapForecastData = (forecast: api.DayForecast, city: string, countryCode: string): Forecast => {
  const condition = api.conditionFromForecast(forecast);
  return {
    isClear: condition == api.WeatherCondition.Clear || condition == api.WeatherCondition.Clouds,
    location: `${city} (${countryCode})`,
    description: forecast.weather[0].description,
    minimumTemperature: forecast.temp.min,
    maxTemperature: forecast.temp.max,
    humidity: forecast.humidity,
    windSpeed: forecast.speed,
    dateUnixTimestamp: forecast.dt,
  };
};

const mapHistoricForecastData = (forecast: api.HistoricalWeatherResponse): Forecast => {
  const condition = api.conditionFromHistoric(forecast);
  return {
    isClear: condition == api.WeatherCondition.Clear || condition == api.WeatherCondition.Clouds,
    description: forecast.current.weather[0].description,
    minimumTemperature: minTemperature(forecast),
    maxTemperature: maxTemperature(forecast),
    humidity: forecast.current.humidity,
    windSpeed: forecast.current.wind_speed,
    dateUnixTimestamp: forecast.current.dt,
    coordinates: { latitude: forecast.lat, longitude: forecast.lon },
  };
};

const minTemperature = (x: api.HistoricalWeatherResponse) =>
  x.hourly.map((x) => x.temp).sort((a, b) => a > b ? 1 : -1)[0];

const maxTemperature = (x: api.HistoricalWeatherResponse) =>
  x.hourly.map((x) => x.temp).sort((a, b) => a < b ? 1 : -1)[0];
