import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../handler";

const port = Number(process.env.PORT ?? 3000);

createServer(async (req: any, res: any) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, x-request-id",
    "Access-Control-Max-Age": "86400",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ message: "Weather API - GET /weather?city=..." }));
    return;
  }

  if (req.method === "GET" && pathname === "/openapi.yaml") {
    try {
      const content = readFileSync(join(process.cwd(), "openapi.yaml"), "utf8");
      res.writeHead(200, { "Content-Type": "text/yaml; charset=utf-8", ...corsHeaders });
      res.end(content);
      return;
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } }));
      return;
    }
  }

  if (req.method === "GET" && pathname === "/docs") {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Weather API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/openapi.yaml",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...corsHeaders });
    res.end(html);
    return;
  }

  if (req.method === "GET" && pathname === "/weather") {
    const event = {
      httpMethod: req.method ?? "GET",
      path: pathname,
      headers: req.headers,
      queryStringParameters: url.searchParams.size
        ? Object.fromEntries(url.searchParams)
        : null,
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const context = { awsRequestId: randomUUID() } as Context;

    const result: any = await handler(event, context);

    res.writeHead(result.statusCode, { ...(result.headers || {}), ...corsHeaders });
    res.end(result.body);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders });
  res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Ruta no encontrada" } }));
}).listen(port, () => console.log(`Local API listening on http://localhost:${port}`));
