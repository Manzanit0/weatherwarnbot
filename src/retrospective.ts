import {
  buildRetrospectiveForecastMessage,
  Day,
  fetchWeatherByCoordinates,
  fetchYesterdayWeatherByCoordinates,
  Forecast,
} from "./forecast.ts";
import { Coordinates } from "./repository.ts";

type MinimalLocation = {
  coordinates: Coordinates;
  name: string;
};

type WhenString = "today" | "tomorrow";

export const newRetrospectiveForecastMessage = async (when: WhenString, location: MinimalLocation) => {
  let previous: Forecast, requested: Forecast;
  switch (when) {
    case "tomorrow": {
      requested = await fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TOMORROW,
      );

      previous = await fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TODAY,
      );

      break;
    }
    case "today": {
      requested = await fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TODAY,
      );

      previous = await fetchYesterdayWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
      );

      break;
    }

    default:
      throw new Error(":_)");
  }

  return buildRetrospectiveForecastMessage(
    { ...previous, location: location.name },
    { ...requested, location: location.name },
  );
};
