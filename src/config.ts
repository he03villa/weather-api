export interface Config {
  geocodingBaseUrl: string;
  forecastBaseUrl: string;
  upstreamTimeoutMs: number;
  logLevel: string;
}

export function getConfig(): Config {
  return {
    geocodingBaseUrl: process.env.GEOCODING_BASE_URL || "https://geocoding-api.open-meteo.com",
    forecastBaseUrl: process.env.FORECAST_BASE_URL || "https://api.open-meteo.com",
    upstreamTimeoutMs: parseInt(process.env.UPSTREAM_TIMEOUT_MS || "5000", 10),
    logLevel: process.env.LOG_LEVEL || "info",
  };
}
