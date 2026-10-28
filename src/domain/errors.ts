export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, statusCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class InvalidRequestError extends AppError {
  constructor(message: string) {
    super("INVALID_REQUEST", 400, message);
  }
}

export class CityNotFoundError extends AppError {
  constructor(city: string) {
    super("CITY_NOT_FOUND", 404, `No se encontró la ciudad '${city}'`);
  }
}

export class UpstreamError extends AppError {
  constructor(message: string = "Error al consultar el servicio de clima") {
    super("UPSTREAM_ERROR", 502, message);
  }
}
