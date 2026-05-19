/**
 * DAY 7 - Task 2: Test the live REST API
 *
 * Makes real HTTP requests to the deployed API Gateway endpoint.
 * Uses Node.js built-in 'https' module (no extra dependencies).
 */

import * as https from "https";
import { GetRestApisCommand } from "@aws-sdk/client-api-gateway";
import { apigw, API_NAME, REGION, STAGE_NAME } from "./client";

// ── Simple HTTP client using Node built-ins ────────────────────────────────
interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function request(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: options.method ?? "GET",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: data,
          })
        );
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function printResult(label: string, res: HttpResponse): void {
  const color = res.status < 300 ? "\x1b[32m" : res.status < 500 ? "\x1b[33m" : "\x1b[31m";
  console.log(`\n--- ${label} ---`);
  console.log(`  Status: ${color}${res.status}\x1b[0m`);
  try {
    console.log("  Body:", JSON.stringify(JSON.parse(res.body), null, 4));
  } catch {
    console.log("  Body:", res.body);
  }
}

// ── Find invoke URL from deployed API ─────────────────────────────────────
async function getInvokeUrl(): Promise<string> {
  const resp = await apigw.send(new GetRestApisCommand({ limit: 500 }));
  const api = (resp.items ?? []).find((a) => a.name === API_NAME);
  if (!api?.id) {
    throw new Error(
      `API '${API_NAME}' not found. Run 'npm run deploy' first.`
    );
  }
  const url = `https://${api.id}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}`;
  console.log(`Invoke URL: ${url}\n`);
  return url;
}

async function main(): Promise<void> {
  console.log("=== Day 7 - Testing REST API ===\n");
  const base = await getInvokeUrl();

  // 1. GET /hello — default greeting
  printResult(
    "GET /hello (default)",
    await request(`${base}/hello`)
  );

  // 2. GET /hello?name=Alice — query string parameter
  printResult(
    "GET /hello?name=Alice",
    await request(`${base}/hello?name=Alice`)
  );

  // 3. POST /echo — send JSON body, get it back
  printResult(
    "POST /echo",
    await request(`${base}/echo`, {
      method: "POST",
      body: JSON.stringify({ user: "learner", day: 7, topic: "API Gateway" }),
    })
  );

  // 4. GET /info — request context (stage, IP, user-agent)
  printResult(
    "GET /info",
    await request(`${base}/info`)
  );

  // 5. GET /items/42 — path parameter parsing
  printResult(
    "GET /items/42",
    await request(`${base}/items/42`)
  );

  // 6. POST /items — create item
  printResult(
    "POST /items",
    await request(`${base}/items`, {
      method: "POST",
      body: JSON.stringify({ name: "Laptop", price: 999 }),
    })
  );

  // 7. GET /unknown — 404 demo
  printResult(
    "GET /unknown (404 demo)",
    await request(`${base}/unknown`)
  );

  console.log("\n=== All requests complete ===");
  console.log("Next: run 'npm run cleanup' to delete all resources");
}

main().catch(console.error);
