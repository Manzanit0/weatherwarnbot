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
  list: Array<DayForecast>;
}

interface DayForecast {
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
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

export async function requestDailyForecast(
  city: string,
  countryCode: string
): Promise<DailyForecastResponse> {
  const key = Deno.env.get("OPENWEATHERMAP_API_KEY");
  const url = `http://api.openweathermap.org/data/2.5/forecast/daily/?q=${city},${countryCode}&APPID=${key}&units=metric&lang=es`;

  const res = await fetch(url);
  if (!res.ok) {
    console.log("http status ", res.status);
    throw new Error("failed to make request to openweathermap API");
  }

  const blob = (await res.json()) as DailyForecastResponse;
  if (!blob) {
    console.log("http status ", res.status);
    throw new Error("unexpected response from openweathermap");
  }

  return blob;
}

// https://openweathermap.org/weather-conditions
export function getWeatherCondition(
  forecast: DayForecast
): WeatherCondition | undefined {
  const code = forecast.weather[0].id;
  if (code >= 200 && code <= 299) {
    return WeatherCondition.Thunderstorm;
  } else if (code >= 300 && code <= 399) {
    return WeatherCondition.Drizzle;
  } else if (code >= 500 && code <= 599) {
    return WeatherCondition.Rain;
  } else if (code >= 600 && code <= 699) {
    return WeatherCondition.Snow;
  } else if (code >= 700 && code <= 799) {
    return WeatherCondition.Atmosphere;
  } else if (code == 800) {
    return WeatherCondition.Clear;
  } else if (code >= 801 && code <= 899) {
    return WeatherCondition.Clouds;
  }
}
