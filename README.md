# Weather API

API serverless en AWS (API Gateway + Lambda) con Node 22 + TypeScript que consulta Open-Meteo (geocoding + forecast), transforma la respuesta y la expone con un contrato propio, limpio y estable.

## Requisitos previos

- Node.js 22.x o superior
- npm 9+
- Docker y Docker Compose (para ejecución local)
- (Opcional) AWS SAM CLI para emular Lambda + API Gateway localmente
- Acceso a internet para consultar Open-Meteo

## Instalación

```bash
npm ci
```

## Ejecución local

### Opción 1: Docker Compose (recomendada, sin instalar nada extra)

```bash
docker compose up --build
```

La API queda disponible en `http://localhost:4000`. Prueba con:

```bash
curl "http://localhost:4000/weather?city=Bogota"
```

### Opción 2: Servidor HTTP local con Node (sin Docker)

```bash
npm run dev
```

La API queda disponible en `http://localhost:3000`. Prueba con:

```bash
curl "http://localhost:3000/weather?city=Bogota"
```

### Opción 3: AWS SAM local (solo si tienes SAM CLI)

```bash
sam build
sam local start-api
```

La API queda disponible en `http://127.0.0.1:3000`.

## Ejecución de pruebas

### Con npm

```bash
npm test
```

### Con Docker Compose

```bash
docker compose run --rm test
```

Ambas opciones ejecutan la suite de Vitest con Open-Meteo simulado (mock), sin hacer llamadas de red reales.

## Ejemplos de llamadas (curl)

### Respuesta exitosa — 200

```bash
curl "http://localhost:4000/weather?city=Bogota"
```

```json
{
  "city": "Bogotá",
  "country": "Colombia",
  "coordinates": {
    "latitude": 4.60971,
    "longitude": -74.08175
  },
  "timezone": "America/Bogota",
  "current": {
    "temperature": { "value": 14.2, "unit": "°C" },
    "humidity": { "value": 78, "unit": "%" },
    "windSpeed": { "value": 6.5, "unit": "km/h" },
    "condition": "Parcialmente nublado",
    "observedAt": "2026-10-27T09:00"
  }
}
```

### Error 400 — INVALID_REQUEST

Caso: ciudad ausente, vacía (tras trim) o con menos de 2 caracteres.

```bash
curl "http://localhost:4000/weather"
```

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "El parámetro city es requerido y debe tener al menos 2 caracteres"
  }
}
```

### Error 404 — CITY_NOT_FOUND

Caso: geocoding sin `results`.

```bash
curl "http://localhost:4000/weather?city=CiudadInventada"
```

```json
{
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "No se encontró la ciudad 'CiudadInventada'"
  }
}
```

### Error 502 — UPSTREAM_ERROR

Caso: Open-Meteo falla, responde con error, JSON inválido o tarda más de 5 segundos.

```bash
curl "http://localhost:4000/weather?city=TimeoutCity"
```

```json
{
  "error": {
    "code": "UPSTREAM_ERROR",
    "message": "Error al consultar el servicio de clima"
  }
}
```

### Error 500 — INTERNAL_ERROR

Caso: error no controlado. El mensaje es genérico y no expone stack ni detalles internos.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Error interno del servidor"
  }
}
```

Todas las respuestas incluyen los headers `Content-Type: application/json` y `x-request-id`.

## Estructura del proyecto

```
weather-api/
├── src/
│   ├── handler.ts              # Handler delgado de Lambda
│   ├── config.ts               # Variables de entorno con defaults
│   ├── logger.ts               # Logger estructurado (JSON) sin dependencias
│   ├── http/
│   │   └── response.ts         # Helpers success/errorResponse + mapeo AppError -> HTTP
│   ├── services/
│   │   ├── weatherService.ts   # Lógica de negocio, validación, transformación, DI del cliente
│   │   └── weatherCache.ts     # Caché en memoria con TTL de 10 minutos
│   ├── clients/
│   │   └── openMeteoClient.ts  # Cliente Open-Meteo (fetch + AbortController, timeout)
│   ├── domain/
│   │   ├── errors.ts           # AppError + InvalidRequestError, CityNotFoundError, UpstreamError
│   │   └── weatherCodes.ts     # Mapa WMO -> español
│   └── local/
│       └── server.ts           # Servidor HTTP local que simula API Gateway + Lambda
├── tests/
│   └── weather.test.ts         # Tests unitarios con Vitest (Open-Meteo mockeado)
├── openapi.yaml                # Especificación OpenAPI 3.0 del contrato
├── template.yaml               # SAM template (Lambda + API Gateway, esbuild)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Decisiones técnicas y por qué

- **Handler delgado**: `src/handler.ts` solo extrae `city` y `awsRequestId`, llama al servicio y delega el mapeo de errores a la capa HTTP. Un único try/catch.
- **Errores tipados**: `AppError` con subclases (`InvalidRequestError`, `CityNotFoundError`, `UpstreamError`) permite mapear de forma uniforme a HTTP en `src/http/response.ts`. Un error desconocido se convierte en `500 INTERNAL_ERROR` genérico sin exponer stack.
- **DI del cliente**: `WeatherService` recibe `OpenMeteoClient` por constructor, lo que permite mockearlo fácilmente en las pruebas.
- **fetch nativo + AbortController**: No se agregaron dependencias de runtime. Cada llamada al upstream tiene su propio timeout configurable (`UPSTREAM_TIMEOUT_MS`, default 5000).
- **Timeout por llamada**: Dos llamadas secuenciales (geocoding + forecast) de hasta 5 s cada una. El timeout de Lambda es 15 s, suficiente para ambas.
- **Logger propio**: JSON por línea a stdout, con `level`, `message`, `requestId`, `timestamp` y campos extra. Filtrado por `LOG_LEVEL`. Un logger hijo con `requestId` fijo para correlacionar.
- **Unidades desde `current_units`**: No se hardcodean; se toman directamente de la respuesta de Open-Meteo.
- **Caché en memoria**: Se guarda el resultado transformado por ciudad (normalizada) durante 10 minutos, evitando llamar a Open-Meteo en cada request. Se invalida automáticamente al expirar.
- **Configuración por variables de entorno**: `GEOCODING_BASE_URL`, `FORECAST_BASE_URL`, `UPSTREAM_TIMEOUT_MS` y `LOG_LEVEL`, con defaults sensatos y sin valores sensibles en código.

## Documentación OpenAPI

La especificación OpenAPI 3.0 que refleja exactamente el contrato implementado se encuentra en [`openapi.yaml`](./openapi.yaml).

### Visualizarla

- [Swagger Editor](https://editor.swagger.io/) - Pega el contenido de `openapi.yaml` o abre el archivo
- [Redoc](https://redocly.github.io/redoc/) - Para una vista más limpia de la documentación
- VSCode con extensión [OpenAPI (Swagger) Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi) - Para editar/visualizar localmente
- Servidor local: `http://localhost:3000/docs` o `http://localhost:4000/docs` (Swagger UI servido desde CDN)

La especificación incluye:
- Endpoint `GET /weather` con parámetro `city` (mínimo 2 caracteres, se recortan espacios)
- Respuesta 200 con el contrato completo (unidades desde `current_units`, `condition` mapeado desde WMO, `observedAt` = `current.time`)
- Errores 400, 404, 502, 500 con formato uniforme `{ "error": { "code": "...", "message": "..." } }`
- Headers `Content-Type: application/json` y `x-request-id` en todas las respuestas

## Qué mejorarías con más tiempo

- **Caché persistente**: Guardar el resultado por ciudad durante 10 minutos en DynamoDB (con TTL) en lugar de en memoria, para no perderlo entre invocaciones/contenedores.
- **Reintentos con backoff**: Reintentar ante errores transitorios de Open-Meteo (timeout, 5xx) con backoff exponencial.
- **OpenAPI en el despliegue**: Integrar la especificación OpenAPI directamente en API Gateway (import REST API) para que la documentación viva con el endpoint.
- **Métricas y alarmas**: Alarmas de CloudWatch para latencia, errores 5xx y timeouts.
- **Tests de integración**: Probar el flujo completo contra Open-Meteo real (o un mock server) en un entorno controlado.
- **CI/CD**: Pipeline (GitHub Actions) que corra lint, typecheck, tests y build en cada PR.
- **Validación más estricta**: Validar que `city` no contenga solo caracteres especiales o números.
- **Rate limiting**: Proteger el endpoint contra abuso con throttling en API Gateway.
