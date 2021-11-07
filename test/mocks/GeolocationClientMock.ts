export class GeolocationClientMock {
  findLocation(_query: string) {
    return Promise.resolve({
      latitude: 123,
      longitude: -123,
      name: "Botany Bay",
      region: "",
      country: "Australia",
    });
  }
}
