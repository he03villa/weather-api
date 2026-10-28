import { UpstreamError } from "../domain/errors";

export interface GeocodingResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
}

export interface CurrentUnits {
  temperature_2m: string;
  relative_humidity_2m: string;
  wind_speed_10m: string;
  weather_code: string;
  time: string;
}

export interface CurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  weather_code: number;
}

export interface ForecastResponse {
  current: CurrentWeather;
  current_units: CurrentUnits;
  timezone: string;
}

export class OpenMeteoClient {
  constructor(
    private geocodingBaseUrl: string,
    private forecastBaseUrl: string,
    private timeoutMs: number
  ) {}

  async geocode(city: string): Promise<GeocodingResult | null> {
    const url = `${this.geocodingBaseUrl}/v1/search?name=${encodeURIComponent(city)}&count=1&language=es`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new UpstreamError("Error al consultar el servicio de geocodificación");
      }
      let data: GeocodingResponse;
      try {
        data = await response.json();
      } catch {
        throw new UpstreamError("Respuesta inválida del servicio de geocodificación");
      }
      if (!data.results || data.results.length === 0) {
        return null;
      }
      return data.results[0] || null;
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new UpstreamError("Timeout al consultar el servicio de geocodificación");
      }
      throw new UpstreamError("Error de red al consultar el servicio de geocodificación");
    } finally {
      clearTimeout(timeout);
    }
  }

  async getCurrentWeather(lat: number, lon: number): Promise<ForecastResponse> {
    const url = `${this.forecastBaseUrl}/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new UpstreamError("Error al consultar el servicio de pronóstico");
      }
      let data: ForecastResponse;
      try {
        data = await response.json();
      } catch {
        throw new UpstreamError("Respuesta inválida del servicio de pronóstico");
      }
      return data;
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new UpstreamError("Timeout al consultar el servicio de pronóstico");
      }
      throw new UpstreamError("Error de red al consultar el servicio de pronóstico");
    } finally {
      clearTimeout(timeout);
    }
  }
}
