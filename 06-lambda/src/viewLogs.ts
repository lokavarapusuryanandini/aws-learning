/**
 * DAY 6 - Task 3: View Lambda CloudWatch logs
 *
 * Concepts:
 *   - Log group = container for all logs from one Lambda function: /aws/lambda/<name>
 *   - Log stream = a sequence of log events from one execution environment instance
 *     Lambda creates a new stream when it starts a new execution environment (cold start)
 *   - Log event = a single log line with a timestamp + message
 *   - Cold start = first invocation on a fresh environment; Lambda creates a new stream
 *   - Warm invocation = reuses an existing environment; same stream
 *   - Retention = by default, Lambda log groups keep logs forever (set a retention policy!)
 */

import {
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { cwLogs, LOG_GROUP } from "./client";

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").replace("Z", " UTC");
}

async function checkLogGroupExists(): Promise<boolean> {
  const resp = await cwLogs.send(
    new DescribeLogGroupsCommand({ logGroupNamePrefix: LOG_GROUP })
  );
  return (resp.logGroups ?? []).some((g) => g.logGroupName === LOG_GROUP);
}

async function listStreams(): Promise<string[]> {
  // Streams are sorted by lastEventTime descending so the most recent is first
  const resp = await cwLogs.send(
    new DescribeLogStreamsCommand({
      logGroupName: LOG_GROUP,
      orderBy: "LastEventTime",
      descending: true,
      limit: 5, // show last 5 streams (one per execution environment)
    })
  );
  const streams = resp.logStreams ?? [];
  console.log(`\nLog group: ${LOG_GROUP}`);
  console.log(`Found ${streams.length} log stream(s):\n`);
  for (const s of streams) {
    console.log(
      `  ${s.logStreamName}\n    Last event: ${s.lastEventTimestamp ? formatTimestamp(s.lastEventTimestamp) : "n/a"}\n    Events:     ${s.storedBytes ?? 0} bytes\n`
    );
  }
  return streams.map((s) => s.logStreamName!).filter(Boolean);
}

async function fetchLogEvents(streamName: string): Promise<void> {
  console.log(`\n=== Events from stream: ${streamName} ===\n`);

  const resp = await cwLogs.send(
    new GetLogEventsCommand({
      logGroupName: LOG_GROUP,
      logStreamName: streamName,
      // startFromHead: true  → oldest first (default: false = newest first)
      startFromHead: true,
      limit: 100,
    })
  );

  const events = resp.events ?? [];
  if (events.length === 0) {
    console.log("  No events in this stream yet.");
    return;
  }

  for (const e of events) {
    const ts = e.timestamp ? formatTimestamp(e.timestamp) : "         ";
    const msg = (e.message ?? "").trimEnd();

    // Lambda adds START, END, and REPORT lines automatically:
    //   START RequestId: ...    <- cold/warm invocation began
    //   END RequestId: ...      <- function finished
    //   REPORT RequestId: ...   <- duration, billed duration, memory used
    if (msg.startsWith("START") || msg.startsWith("END") || msg.startsWith("REPORT")) {
      console.log(`  \x1b[90m${ts}  ${msg}\x1b[0m`); // grey
    } else if (msg.includes("ERROR") || msg.includes("Error")) {
      console.log(`  \x1b[31m${ts}  ${msg}\x1b[0m`); // red
    } else {
      console.log(`  ${ts}  ${msg}`);
    }
  }
  console.log(`\n  Total: ${events.length} event(s)`);
}

async function main(): Promise<void> {
  console.log("=== Day 6 - View Lambda CloudWatch Logs ===");

  const exists = await checkLogGroupExists();
  if (!exists) {
    console.log(
      `\nLog group '${LOG_GROUP}' does not exist yet.\n` +
        `Run 'npm run invoke' first to trigger some invocations.`
    );
    return;
  }

  const streamNames = await listStreams();
  if (streamNames.length === 0) {
    console.log("No log streams found. Run 'npm run invoke' to generate some logs.");
    return;
  }

  // Show events from the most recent stream (index 0 — descending order)
  await fetchLogEvents(streamNames[0]);
}

main().catch(console.error);
