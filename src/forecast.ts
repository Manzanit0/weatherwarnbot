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

export type ForecastClient = {
  fetchWeatherByCoordinates: (lat: number, lon: number, when?: Day) => Promise<Forecast>;
  fetchYesterdayWeatherByCoordinates: (lat: number, lon: number) => Promise<Forecast>;
};

export const newForecastClient = (c: WeatherClient): ForecastClient => ({
  fetchWeatherByCoordinates: fetchWeatherByCoordinatesWithClient(c),
  fetchYesterdayWeatherByCoordinates: fetchYesterdayWeatherByCoordinatesWithClient(c),
});

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
