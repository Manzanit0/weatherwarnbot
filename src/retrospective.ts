import { Day, Forecast, newForecastClient } from "./forecast.ts";
import { retrospectiveMessage } from "./messages.ts";
import { WeatherClient } from "./openweathermap.ts";
import { Coordinates } from "./repository/locations.ts";

type MinimalLocation = {
  coordinates: Coordinates;
  name: string;
};

type WhenString = "now" | "tomorrow";

export const newRetrospectiveForecastMessage = async (
  wc: WeatherClient,
  when: WhenString,
  location: MinimalLocation,
) => {
  const fc = newForecastClient(wc);

  let previous: Forecast, requested: Forecast;
  switch (when) {
    case "tomorrow": {
      requested = await fc.fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TOMORROW,
      );

      previous = await fc.fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TODAY,
      );

      break;
    }
    case "now": {
      requested = await fc.fetchWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
        Day.TODAY,
      );

      previous = await fc.fetchYesterdayWeatherByCoordinates(
        location.coordinates.latitude,
        location.coordinates.longitude,
      );

      break;
    }

    default:
      throw new Error(":_)");
  }

  return retrospectiveMessage(
    { ...previous, location: location.name },
    { ...requested, location: location.name },
  );
};
