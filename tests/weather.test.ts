import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeatherService } from "../src/services/weatherService";
import { OpenMeteoClient } from "../src/clients/openMeteoClient";
import { InvalidRequestError, CityNotFoundError, UpstreamError } from "../src/domain/errors";
import { mapWeatherCode } from "../src/domain/weatherCodes";
import { errorResponse, success } from "../src/http/response";
import { handler } from "../src/handler";

describe("Weather Codes", () => {
  it("maps WMO codes correctly", () => {
    expect(mapWeatherCode(0)).toBe("Despejado");
    expect(mapWeatherCode(1)).toBe("Mayormente despejado");
    expect(mapWeatherCode(2)).toBe("Parcialmente nublado");
    expect(mapWeatherCode(3)).toBe("Nublado");
    expect(mapWeatherCode(45)).toBe("Niebla");
    expect(mapWeatherCode(48)).toBe("Niebla");
    expect(mapWeatherCode(51)).toBe("Llovizna");
    expect(mapWeatherCode(57)).toBe("Llovizna");
    expect(mapWeatherCode(61)).toBe("Lluvia");
    expect(mapWeatherCode(67)).toBe("Lluvia");
    expect(mapWeatherCode(80)).toBe("Lluvia");
    expect(mapWeatherCode(82)).toBe("Lluvia");
    expect(mapWeatherCode(71)).toBe("Nieve");
    expect(mapWeatherCode(77)).toBe("Nieve");
    expect(mapWeatherCode(85)).toBe("Nieve");
    expect(mapWeatherCode(86)).toBe("Nieve");
    expect(mapWeatherCode(95)).toBe("Tormenta eléctrica");
    expect(mapWeatherCode(99)).toBe("Tormenta eléctrica");
    expect(mapWeatherCode(999)).toBe("Condición desconocida");
  });
});

describe("WeatherService", () => {
  let mockClient: OpenMeteoClient;
  let service: WeatherService;

  beforeEach(() => {
    mockClient = {
      geocode: vi.fn(),
      getCurrentWeather: vi.fn(),
    } as any;
    service = new WeatherService(mockClient);
  });

  it("transforms complete response to contract with units from current_units", async () => {
    (mockClient.geocode as any).mockResolvedValue({
      name: "Bogotá",
      country: "Colombia",
      latitude: 4.60971,
      longitude: -74.08175,
      timezone: "America/Bogota",
    });
    (mockClient.getCurrentWeather as any).mockResolvedValue({
      current: {
        time: "2026-10-27T09:00",
        temperature_2m: 14.2,
        relative_humidity_2m: 78,
        wind_speed_10m: 6.5,
        weather_code: 2,
      },
      current_units: {
        temperature_2m: "°C",
        relative_humidity_2m: "%",
        wind_speed_10m: "km/h",
        weather_code: "wmo code",
        time: "iso8601",
      },
      timezone: "America/Bogota",
    });

    const result = await service.getWeather("Bogota");
    expect(result).toEqual({
      city: "Bogotá",
      country: "Colombia",
      coordinates: { latitude: 4.60971, longitude: -74.08175 },
      timezone: "America/Bogota",
      current: {
        temperature: { value: 14.2, unit: "°C" },
        humidity: { value: 78, unit: "%" },
        windSpeed: { value: 6.5, unit: "km/h" },
        condition: "Parcialmente nublado",
        observedAt: "2026-10-27T09:00",
      },
    });
  });

  it("throws InvalidRequestError for empty city", async () => {
    await expect(service.getWeather("")).rejects.toThrow(InvalidRequestError);
  });

  it("throws InvalidRequestError for city with only spaces", async () => {
    await expect(service.getWeather("   ")).rejects.toThrow(InvalidRequestError);
  });

  it("throws InvalidRequestError for city with 1 character", async () => {
    await expect(service.getWeather("A")).rejects.toThrow(InvalidRequestError);
  });

  it("trims city with spaces around", async () => {
    (mockClient.geocode as any).mockResolvedValue({
      name: "Lima",
      country: "Perú",
      latitude: -12.0464,
      longitude: -77.0428,
      timezone: "America/Lima",
    });
    (mockClient.getCurrentWeather as any).mockResolvedValue({
      current: {
        time: "2026-10-27T10:00",
        temperature_2m: 18,
        relative_humidity_2m: 65,
        wind_speed_10m: 10,
        weather_code: 0,
      },
      current_units: {
        temperature_2m: "°C",
        relative_humidity_2m: "%",
        wind_speed_10m: "km/h",
        weather_code: "wmo code",
        time: "iso8601",
      },
      timezone: "America/Lima",
    });

    const result = await service.getWeather("  Lima  ");
    expect(mockClient.geocode).toHaveBeenCalledWith("Lima");
    expect(result.city).toBe("Lima");
  });

  it("throws CityNotFoundError when geocoding returns null", async () => {
    (mockClient.geocode as any).mockResolvedValue(null);
    await expect(service.getWeather("CiudadInventada")).rejects.toThrow(CityNotFoundError);
  });
});

describe("HTTP Response", () => {
  it("success returns 200 with correct headers", () => {
    const result = success({ test: true }, "req-123");
    expect(result.statusCode).toBe(200);
    expect(result.headers?.["Content-Type"]).toBe("application/json");
    expect(result.headers?.["x-request-id"]).toBe("req-123");
  });

  it("errorResponse maps AppError correctly", () => {
    const err = new InvalidRequestError("bad request");
    const result = errorResponse(err, "req-456");
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(result.headers?.["Content-Type"]).toBe("application/json");
    expect(result.headers?.["x-request-id"]).toBe("req-456");
  });

  it("errorResponse returns 500 for unknown error without exposing details", () => {
    const err = new Error("Sensitive internal error with stack trace");
    const result = errorResponse(err, "req-789");
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Error interno del servidor");
    expect(body.error.message).not.toContain("stack");
  });
});

describe("Handler", () => {
  it("handles queryStringParameters null without breaking", async () => {
    const event = {
      queryStringParameters: null,
    } as any;
    const context = { awsRequestId: "test-123" } as any;
    const result = await handler(event, context);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(result.headers?.["Content-Type"]).toBe("application/json");
    expect(result.headers?.["x-request-id"]).toBe("test-123");
  });
});
