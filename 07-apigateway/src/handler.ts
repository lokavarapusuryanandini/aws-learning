/**
 * API GATEWAY LAMBDA PROXY HANDLER
 *
 * Lambda Proxy Integration = API Gateway forwards the ENTIRE HTTP request to Lambda
 * and returns Lambda's response directly to the caller.
 *
 * event.path          = the URL path (e.g. "/hello")
 * event.httpMethod    = "GET", "POST", etc.
 * event.headers       = all HTTP headers
 * event.queryStringParameters = ?key=value pairs
 * event.body          = raw request body string (you must JSON.parse it)
 * event.requestContext = stage, sourceIp, requestId, etc.
 *
 * You MUST return: { statusCode, headers, body (string) }
 * body must be a string — use JSON.stringify() for JSON responses
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

function jsonResponse(statusCode: number, data: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // CORS header so browsers can call this API
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data, null, 2),
  };
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const { httpMethod: method, path, queryStringParameters: query, body } = event;
  console.log(`${method} ${path}`);

  // --- GET /hello?name=X ---
  if (method === "GET" && path === "/hello") {
    const name = query?.name ?? "World";
    return jsonResponse(200, {
      message: `Hello, ${name}!`,
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
    });
  }

  // --- POST /echo --- echoes back the request body + metadata
  if (method === "POST" && path === "/echo") {
    let parsed: unknown = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      return jsonResponse(400, { error: "Request body must be valid JSON" });
    }
    return jsonResponse(200, {
      echo: parsed,
      meta: {
        method,
        path,
        contentType: event.headers["Content-Type"] ?? event.headers["content-type"],
      },
    });
  }

  // --- GET /info --- exposes request context info (useful for debugging)
  if (method === "GET" && path === "/info") {
    return jsonResponse(200, {
      stage: event.requestContext.stage,
      sourceIp: event.requestContext.identity?.sourceIp,
      userAgent: event.headers["User-Agent"] ?? event.headers["user-agent"],
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      remainingMs: context.getRemainingTimeInMillis(),
    });
  }

  // --- GET /items/:id --- path parameter parsing via regex
  const itemMatch = path.match(/^\/items\/(.+)$/);
  if (itemMatch && method === "GET") {
    const id = itemMatch[1];
    // In a real app, you'd fetch from DynamoDB/RDS here
    return jsonResponse(200, {
      item: { id, name: "Sample Widget", price: 9.99, inStock: true },
    });
  }

  // --- POST /items --- create an item
  if (method === "POST" && path === "/items") {
    let payload: Record<string, unknown> = {};
    try {
      payload = body ? JSON.parse(body) : {};
    } catch {
      return jsonResponse(400, { error: "Request body must be valid JSON" });
    }
    return jsonResponse(201, {
      created: true,
      item: { id: `item-${Date.now()}`, ...payload },
    });
  }

  // --- 404 catch-all ---
  return jsonResponse(404, {
    error: "Not found",
    path,
    method,
    availableRoutes: [
      "GET  /hello?name=X",
      "POST /echo",
      "GET  /info",
      "GET  /items/:id",
      "POST /items",
    ],
  });
};
