import * as api from "./openweathermap.ts";

export interface Forecast {
  isClear: boolean;
  location: string;
  description: string;
  minimumTemperature: number;
  maxTemperature: number;
  humidity: number;
  windSpeed: number;
  dateUnixTimestamp: number;
}

export async function getForecastMessage(city: string, code: string) {
  const forecast = await fetchTomorrowsForecast(city, code);
  return buildForecastMessage(forecast);
}

async function fetchTomorrowsForecast(
  city: string,
  countryCode: string
): Promise<Forecast> {
  const response = await api.requestDailyForecast(city, countryCode);
  const forecast = response.list[1];
  const condition = api.getWeatherCondition(forecast);

  return {
    isClear:
      condition == api.WeatherCondition.Clear ||
      condition == api.WeatherCondition.Clouds,
    location: `${city} (${countryCode})`,
    description: forecast.weather[0].description,
    minimumTemperature: forecast.temp.min,
    maxTemperature: forecast.temp.max,
    humidity: forecast.humidity,
    windSpeed: forecast.speed,
    dateUnixTimestamp: forecast.dt,
  };
}

function buildForecastMessage(forecast: Forecast) {
  const UNIX_DT_TRANSFORM_RATIO = 1000;
  const dateString = new Date(
    forecast.dateUnixTimestamp * UNIX_DT_TRANSFORM_RATIO
  ).toDateString();

  return `🚩 ${forecast.location}
    - - - - - - - - - - - - - - - - - - - - - -
    🕘 ${dateString}
    🌀 ${forecast.description}
    🔰 ${forecast.minimumTemperature}°C - ${forecast.maxTemperature}ºC
    💧 ${forecast.humidity}%
    💨 ${forecast.windSpeed} m/s
    - - - - - - - - - - - - - - - - - - - - - -
    `;
}
