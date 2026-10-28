import { APIGatewayProxyResult } from "aws-lambda";
import { AppError } from "../domain/errors";

export function success(body: unknown, requestId?: string): APIGatewayProxyResult {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requestId) {
    headers["x-request-id"] = requestId;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(body),
  };
}

export function errorResponse(err: unknown, requestId?: string): APIGatewayProxyResult {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requestId) {
    headers["x-request-id"] = requestId;
  }

  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      headers,
      body: JSON.stringify({
        error: {
          code: err.code,
          message: err.message,
        },
      }),
    };
  }

  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "Error interno del servidor",
      },
    }),
  };
}
