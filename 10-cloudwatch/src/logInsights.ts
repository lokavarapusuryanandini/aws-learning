/**
 * DAY 10 - Task 3: CloudWatch Logs + Logs Insights
 *
 * Concepts:
 *   - Log group = container for related log streams (one per app/service)
 *   - Log stream = sequence of log events from one source (one Lambda instance, one EC2 instance)
 *   - Log event = a single log line with a timestamp (in ms) and message
 *   - PutLogEvents = push log data to CloudWatch (batched, sequenceToken needed for existing streams)
 *   - Logs Insights = SQL-like query language to search and aggregate log data
 *     - fields, filter, stats, sort, limit, parse
 *   - Retention policy = auto-delete old logs (saves cost); default is "never expire"
 *   - Metric filter = extract a numeric value from log messages and turn it into a CloudWatch metric
 */

import {
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  StartQueryCommand,
  GetQueryResultsCommand,
  DescribeLogGroupsCommand,
  PutRetentionPolicyCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { cwLogs, LOG_GROUP, LOG_STREAM } from "./client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Generate realistic-looking structured JSON log lines
function generateLogs(): { timestamp: number; message: string }[] {
  const routes   = ["/api/orders", "/api/users", "/api/products", "/api/health"];
  const statuses = [200, 200, 200, 200, 201, 400, 404, 500];
  const levels   = ["INFO", "INFO", "INFO", "WARN", "ERROR"];
  const now = Date.now();

  return Array.from({ length: 50 }, (_, i) => {
    const level   = levels[Math.floor(Math.random() * levels.length)];
    const route   = routes[Math.floor(Math.random() * routes.length)];
    const status  = statuses[Math.floor(Math.random() * statuses.length)];
    const latency = Math.floor(Math.random() * 900) + 50;
    const msg = JSON.stringify({
      level,
      path: route,
      method: "GET",
      status,
      latency,
      requestId: `req-${i.toString().padStart(3, "0")}`,
      error: status >= 500 ? "Internal Server Error" : undefined,
    });
    return { timestamp: now - (50 - i) * 1000, message: msg };
  });
}

async function setupLogGroup(): Promise<void> {
  // Create log group (idempotent — no error if it already exists)
  await cwLogs
    .send(new CreateLogGroupCommand({ logGroupName: LOG_GROUP }))
    .catch((e) => { if (e.name !== "ResourceAlreadyExistsException") throw e; });

  // Set 7-day retention policy to avoid storing logs forever
  await cwLogs.send(
    new PutRetentionPolicyCommand({ logGroupName: LOG_GROUP, retentionInDays: 7 })
  );
  console.log(`Log group: ${LOG_GROUP} (retention: 7 days)`);

  // Create log stream
  await cwLogs
    .send(new CreateLogStreamCommand({ logGroupName: LOG_GROUP, logStreamName: LOG_STREAM }))
    .catch((e) => { if (e.name !== "ResourceAlreadyExistsException") throw e; });
  console.log(`Log stream: ${LOG_STREAM}`);
}

async function putLogs(): Promise<void> {
  const events = generateLogs();
  console.log(`\nPushing ${events.length} log events...`);

  // Must be sorted by timestamp ascending
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  await cwLogs.send(
    new PutLogEventsCommand({
      logGroupName: LOG_GROUP,
      logStreamName: LOG_STREAM,
      logEvents: sorted.map(({ timestamp, message }) => ({ timestamp, message })),
    })
  );
  console.log("Log events pushed");
}

async function runQuery(label: string, queryString: string): Promise<void> {
  console.log(`\n--- Query: ${label} ---`);
  console.log(`  ${queryString.trim()}`);

  const endTime   = Math.floor(Date.now() / 1000);
  const startTime = endTime - 300; // last 5 minutes

  const startResp = await cwLogs.send(
    new StartQueryCommand({
      logGroupName: LOG_GROUP,
      startTime,
      endTime,
      queryString,
      limit: 20,
    })
  );
  const queryId = startResp.queryId!;

  // Poll until complete
  let status = "Running";
  while (status === "Running" || status === "Scheduled") {
    await sleep(1000);
    const result = await cwLogs.send(new GetQueryResultsCommand({ queryId }));
    status = result.status ?? "Complete";
    if (status === "Running") process.stdout.write(".");
  }
  process.stdout.write("\n");

  const result = await cwLogs.send(new GetQueryResultsCommand({ queryId }));
  const rows = result.results ?? [];
  console.log(`  Results (${rows.length} rows):`);
  for (const row of rows.slice(0, 5)) {
    const fields = Object.fromEntries(row.map((f) => [f.field, f.value]));
    console.log("   ", JSON.stringify(fields));
  }
}

async function main(): Promise<void> {
  console.log("=== Day 10 - CloudWatch Logs Insights ===\n");

  await setupLogGroup();
  await putLogs();
  await sleep(2000); // brief wait for ingestion

  // Query 1: count errors by route
  await runQuery(
    "Error count by path",
    `fields @message
     | parse @message '"status":*,' as status
     | filter status >= 500
     | stats count() as errorCount by path
     | sort errorCount desc`
  );

  // Query 2: average latency by route
  await runQuery(
    "Average latency by path",
    `fields @message
     | parse @message '"path":"*"' as path
     | parse @message '"latency":*,' as latency
     | stats avg(latency) as avgLatency by path
     | sort avgLatency desc`
  );

  // Query 3: recent errors
  await runQuery(
    "Recent ERROR entries",
    `fields @timestamp, @message
     | filter @message like /ERROR/
     | sort @timestamp desc
     | limit 5`
  );

  console.log("\nNext: run 'npm run dashboard'");
}

main().catch(console.error);
