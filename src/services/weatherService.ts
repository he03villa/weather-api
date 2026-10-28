import { OpenMeteoClient } from "../clients/openMeteoClient";
import { CityNotFoundError, InvalidRequestError } from "../domain/errors";
import { mapWeatherCode } from "../domain/weatherCodes";
import { weatherCache } from "./weatherCache";

export interface WeatherResponse {
  city: string;
  country: string;
  coordinates: { latitude: number; longitude: number };
  timezone: string;
  current: {
    temperature: { value: number; unit: string };
    humidity: { value: number; unit: string };
    windSpeed: { value: number; unit: string };
    condition: string;
    observedAt: string;
  };
}

export class WeatherService {
  constructor(private client: OpenMeteoClient) {}

  async getWeather(city: string): Promise<WeatherResponse> {
    const trimmedCity = city.trim();
    if (!trimmedCity || trimmedCity.length < 2) {
      throw new InvalidRequestError("El parámetro city es requerido y debe tener al menos 2 caracteres");
    }

    const cached = weatherCache.get(trimmedCity);
    if (cached) {
      return cached;
    }

    const geocoding = await this.client.geocode(trimmedCity);
    if (!geocoding) {
      throw new CityNotFoundError(trimmedCity);
    }

    const forecast = await this.client.getCurrentWeather(geocoding.latitude, geocoding.longitude);

    const result: WeatherResponse = {
      city: geocoding.name,
      country: geocoding.country,
      coordinates: {
        latitude: geocoding.latitude,
        longitude: geocoding.longitude,
      },
      timezone: forecast.timezone || geocoding.timezone,
      current: {
        temperature: {
          value: forecast.current.temperature_2m,
          unit: forecast.current_units.temperature_2m || "°C",
        },
        humidity: {
          value: forecast.current.relative_humidity_2m,
          unit: forecast.current_units.relative_humidity_2m || "%",
        },
        windSpeed: {
          value: forecast.current.wind_speed_10m,
          unit: forecast.current_units.wind_speed_10m || "km/h",
        },
        condition: mapWeatherCode(forecast.current.weather_code),
        observedAt: forecast.current.time,
      },
    };

    weatherCache.set(trimmedCity, result);
    return result;
  }
}
