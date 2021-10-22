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

export enum Day {
  TODAY,
  TOMORROW,
  IN_TWO_DAYS,
  IN_THREE_DAYS,
  IN_FOUR_DAYS,
  IN_FIVE_DAYS,
}

export const fetchWeatherByName = (city: string, countryCode: string, when: Day = Day.TODAY) =>
  api.requestDailyForecast(city, countryCode)
    .then((x) => mapForecastData(x.list[when], city, countryCode.toUpperCase()));

export const fetchWeatherByCoordinates = (lat: number, lon: number, when: Day = Day.TODAY) =>
  api.requestDailyForecastByCoordinate({ latitude: lat, longitude: lon })
    .then((x) => mapForecastData(x.list[when], "", "N/a"));

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

const mapForecastData = (forecast: api.DayForecast, city: string, countryCode: string) => {
  const condition = api.getWeatherCondition(forecast);
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
