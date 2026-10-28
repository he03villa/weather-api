import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { getConfig } from "./config";
import { OpenMeteoClient } from "./clients/openMeteoClient";
import { WeatherService } from "./services/weatherService";
import { errorResponse, success } from "./http/response";
import { logger } from "./logger";

const config = getConfig();
const client = new OpenMeteoClient(config.geocodingBaseUrl, config.forecastBaseUrl, config.upstreamTimeoutMs);
const weatherService = new WeatherService(client);

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestId = context.awsRequestId;
  const requestLogger = logger.withRequestId(requestId);

  try {
    requestLogger.info("weather_request_started");

    const city = event.queryStringParameters?.city;

    const result = await weatherService.getWeather(city || "");
    requestLogger.info("weather_request_completed");
    return success(result, requestId);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "InvalidRequestError" || error.name === "CityNotFoundError") {
        requestLogger.warn("weather_request_failed_controlled", { errorCode: (error as any).code });
      } else if (error.name === "UpstreamError") {
        requestLogger.warn("weather_request_failed_upstream", { errorCode: (error as any).code });
      } else {
        requestLogger.error("weather_request_failed_uncontrolled", { error: error.message, stack: error.stack });
      }
    } else {
      requestLogger.error("weather_request_failed_unknown");
    }

    return errorResponse(error, requestId);
  }
};
