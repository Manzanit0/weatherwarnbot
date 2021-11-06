import { getLogger } from "./logger.ts";

const dl = await getLogger();

interface WeatherDescription {
  "id": number;
  "main": string;
  "description": string;
  "icon": string;
}

export interface DailyForecastResponse {
  city: {
    id: number;
    name: string;
    coord: { lon: number; lat: number };
    country: string;
    population: number;
    timezone: number;
  };
  cod: string;
  message: number;
  cnt: number;
  list: DayForecast[];
}

export interface DayForecast {
  weather: WeatherDescription[];
  temp: {
    day: number;
    night: number;
    eve: number;
    morn: number;
    min: number;
    max: number;
  };
  feels_like: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  humidity: number;
  speed: number;
  dt: number;
  sunrise: number;
  sunset: number;
  pressure: number;
  deg: number;
  gust: number;
  clouds: number;
  pop: number;
}

export enum WeatherCondition {
  Thunderstorm,
  Drizzle,
  Rain,
  Snow,
  Atmosphere,
  Clear,
  Clouds,
}

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export interface HistoricalWeatherResponse {
  "lat": number;
  "lon": number;
  "timezone": string;
  "timezone_offset": number;
  "current": HistoricalCurrentWeather;
  "hourly": HistoricalHourlyWeather[];
}

interface HistoricalCurrentWeather {
  "dt": number;
  "sunrise": number;
  "sunset": number;
  "temp": number;
  "feels_like": number;
  "pressure": number;
  "humidity": number;
  "dew_point": number;
  "uvi": number;
  "clouds": number;
  "visibility": number;
  "wind_speed": number;
  "wind_deg": number;
  "wind_gust": number;
  "weather": WeatherDescription[];
}

interface HistoricalHourlyWeather {
  "dt": number;
  "temp": number;
  "feels_like": number;
  "pressure": number;
  "humidity": number;
  "dew_point": number;
  "uvi": number;
  "clouds": number;
  "visibility": number;
  "wind_speed": number;
  "wind_deg": number;
  "wind_gust": number;
  "weather": WeatherDescription[];
  "rain": unknown;
}

export const requestDailyForecastByCoordinate = (coords: Coordinates) =>
  fetchOpenWeatherMap<DailyForecastResponse>(
    `/data/2.5/forecast/daily/?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&lang=es`,
  );

export const requestDailyForecast = (city: string, countryCode: string) =>
  fetchOpenWeatherMap<DailyForecastResponse>(`/data/2.5/forecast/daily/?q=${city},${countryCode}&units=metric&lang=es`);

const generateYesterdayTimestamp = () => Math.floor(new Date().setDate(new Date().getDate() - 1) / 1000);

export const requestYesterdaysForecast = (coords: Coordinates) =>
  fetchOpenWeatherMap<HistoricalWeatherResponse>(
    `/data/2.5/onecall/timemachine?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&lang=es&dt=${generateYesterdayTimestamp()}`,
  );

const fetchOpenWeatherMap = async <T>(endpoint: string) => {
  const key = Deno.env.get("OPENWEATHERMAP_API_KEY");
  const url = `http://api.openweathermap.org${endpoint}&appid=${key}`;

  dl.info(`Sending request to ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    dl.warning(`http status ${res.status}`);
    throw new Error("failed to make request to openweathermap API");
  }

  const blob = (await res.json()) as T;
  if (!blob) {
    dl.warning(`http status ${res.status}`);
    throw new Error("unexpected response from openweathermap");
  }

  return blob;
};

export function conditionFromForecast(forecast: DayForecast): WeatherCondition | undefined {
  return codeToWeatherCondition(forecast.weather[0].id);
}

export function conditionFromHistoric(forecast: HistoricalWeatherResponse): WeatherCondition | undefined {
  return codeToWeatherCondition(forecast.current.weather[0].id);
}

// https://openweathermap.org/weather-conditions
function codeToWeatherCondition(weatherCode: number): WeatherCondition | undefined {
  if (weatherCode >= 200 && weatherCode <= 299) {
    return WeatherCondition.Thunderstorm;
  } else if (weatherCode >= 300 && weatherCode <= 399) {
    return WeatherCondition.Drizzle;
  } else if (weatherCode >= 500 && weatherCode <= 599) {
    return WeatherCondition.Rain;
  } else if (weatherCode >= 600 && weatherCode <= 699) {
    return WeatherCondition.Snow;
  } else if (weatherCode >= 700 && weatherCode <= 799) {
    return WeatherCondition.Atmosphere;
  } else if (weatherCode == 800) {
    return WeatherCondition.Clear;
  } else if (weatherCode >= 801 && weatherCode <= 899) {
    return WeatherCondition.Clouds;
  }
}
