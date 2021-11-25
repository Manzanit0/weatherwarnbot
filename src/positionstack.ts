import { Logger } from "./logger.ts";

export interface GeolocationClient {
  findLocation(query: string): Promise<Location | null>;
}

type Location = {
  latitude: number;
  longitude: number;
  name: string;
  region: string;
  country: string;
};

class PositionStackClient {
  logger: Logger;

  constructor(l: Logger) {
    this.logger = l;
  }

  async findLocation(query: string) {
    const apiKey = Deno.env.get("POSITIONSTACK_API_KEY");
    // The free tier does not support TLS encrypted connections.
    const url = encodeURI(
      `http://api.positionstack.com/v1/forward?access_key=${apiKey}&query=${query}`,
    );

    this.logger.info(`Sending request to ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warning(`http status ${res.status}`);
      throw new Error("failed to make request to positionstack API");
    }

    const blob = (await res.json()) as LocationRequestResponse;
    if (!blob) {
      this.logger.warning(`http status ${res.status}`);
      throw new Error("unexpected response from positionstack");
    }

    if (!blob.data || blob.data.length < 1) {
      this.logger.warning(
        `positonstack query ${query} returned invalid payload or zero results`,
      );

      this.logger.debug(`positionstack response=${JSON.stringify(blob)}`);
      return null;
    }

    return blob.data[0];
  }
}

type LocationRequestResponse = {
  "data": LocationData[];
};

// TODO: by parsing this data we can enhance the location names by grouping a
// macrohood along with the locality name, etc. i.e. Moratalaz, Madrid.
type LocationData = {
  "latitude": number;
  "longitude": number;
  "label": string;
  "name": string;
  "type": string;
  "number": string;
  "street": string;
  "postal_code": string;
  "confidence": 1;
  "region": string;
  "region_code": string;
  "administrative_area": null | string;
  "neighbourhood": string;
  "country": string;
  "country_code": string;
  "map_url": string;
};

export const newGeolocationClient = (l: Logger): GeolocationClient => new PositionStackClient(l);
