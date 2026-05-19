/**
 * DAY 10 - Task 4: CloudWatch Dashboard
 *
 * Concepts:
 *   - Dashboard = a JSON-defined collection of widgets visible in the AWS Console
 *   - Widget types: metric (line/stacked/number), alarm, text (Markdown), log
 *   - Grid = 24 columns wide; each widget has x, y, width, height
 *   - PutDashboard = create or replace a dashboard (idempotent)
 *   - Dashboard body = a JSON string (not an object — must be JSON.stringify'd)
 *   - Use case: centralised observability for a service or team
 */

import {
  PutDashboardCommand,
  ListDashboardsCommand,
} from "@aws-sdk/client-cloudwatch";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { cw, NAMESPACE, ALARM_NAME, DASHBOARD_NAME } from "./client";

const REGION = "us-east-1";
const sts = new STSClient({ region: REGION });

async function getAccountId(): Promise<string> {
  const resp = await sts.send(new GetCallerIdentityCommand({}));
  if (!resp.Account) {
    throw new Error("Unable to resolve AWS account ID");
  }
  return resp.Account;
}

async function createDashboard(): Promise<void> {
  const accountId = await getAccountId();
  const alarmArn = (name: string) => `arn:aws:cloudwatch:${REGION}:${accountId}:alarm:${name}`;

  // Dashboard body is a JSON string containing a "widgets" array
  const dashboardBody = JSON.stringify({
    widgets: [
      // ── Row 1: Title ──────────────────────────────────────────────────
      {
        type: "text",
        x: 0, y: 0, width: 24, height: 2,
        properties: {
          markdown:
            "# aws-learning Day 10\n" +
            "Monitoring the **api** service in the **learning** environment. " +
            "Namespace: `" + NAMESPACE + "`",
        },
      },

      // ── Row 2: Latency line chart ──────────────────────────────────────
      {
        type: "metric",
        x: 0, y: 2, width: 12, height: 6,
        properties: {
          title: "API Latency (avg, p99) — ms",
          region: REGION,
          view: "timeSeries",
          stacked: false,
          annotations: {},
          metrics: [
            [NAMESPACE, "ApiLatency", "service", "api", "environment", "learning",
              { label: "Avg Latency", stat: "Average", color: "#1f77b4" }],
            [NAMESPACE, "ApiLatency", "service", "api", "environment", "learning",
              { label: "P99 Latency", stat: "p99",     color: "#d62728" }],
          ],
          period: 60,
          yAxis: { left: { min: 0, label: "ms" } },
        },
      },

      // ── Row 2: Request + Error counts ────────────────────────────────
      {
        type: "metric",
        x: 12, y: 2, width: 12, height: 6,
        properties: {
          title: "Requests & Errors per minute",
          region: REGION,
          view: "timeSeries",
          stacked: false,
          annotations: {},
          metrics: [
            [NAMESPACE, "RequestCount", "service", "api", "environment", "learning",
              { label: "Requests", stat: "Sum", color: "#2ca02c" }],
            [NAMESPACE, "ErrorCount", "service", "api", "environment", "learning",
              { label: "Errors", stat: "Sum", color: "#ff7f0e" }],
          ],
          period: 60,
        },
      },

      // ── Row 3: Single-value widgets (numbers) ─────────────────────────
      {
        type: "metric",
        x: 0, y: 8, width: 6, height: 3,
        properties: {
          title: "Avg Latency (last hour)",
          region: REGION,
          view: "singleValue",
          annotations: {},
          metrics: [
            [NAMESPACE, "ApiLatency", "service", "api", "environment", "learning",
              { stat: "Average", period: 3600 }],
          ],
        },
      },
      {
        type: "metric",
        x: 6, y: 8, width: 6, height: 3,
        properties: {
          title: "Total Errors (last hour)",
          region: REGION,
          view: "singleValue",
          annotations: {},
          metrics: [
            [NAMESPACE, "ErrorCount", "service", "api", "environment", "learning",
              { stat: "Sum", period: 3600 }],
          ],
        },
      },

      // ── Row 3: Alarm status widget ────────────────────────────────────
      {
        type: "alarm",
        x: 12, y: 8, width: 12, height: 3,
        properties: {
          title: "Alarm Status",
          region: REGION,
          alarms: [
            alarmArn(ALARM_NAME),
            alarmArn(`${ALARM_NAME}-p99`),
          ],
        },
      },

      // ── Row 4: Log widget ─────────────────────────────────────────────
      {
        type: "log",
        x: 0, y: 11, width: 24, height: 6,
        properties: {
          title: "Recent Errors (Log Insights)",
          region: "us-east-1",
          query:
            `SOURCE '/aws-learning/day10'\n` +
            `| fields @timestamp, @message\n` +
            `| filter @message like /ERROR/\n` +
            `| sort @timestamp desc\n` +
            `| limit 20`,
          view: "table",
        },
      },
    ],
  });

  await cw.send(
    new PutDashboardCommand({
      DashboardName: DASHBOARD_NAME,
      DashboardBody: dashboardBody,
    })
  );
  console.log(`Dashboard created/updated: ${DASHBOARD_NAME}`);
  console.log(
    `View in console: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${DASHBOARD_NAME}`
  );
}

async function listDashboards(): Promise<void> {
  const resp = await cw.send(new ListDashboardsCommand({}));
  const mine = (resp.DashboardEntries ?? []).filter((d) =>
    d.DashboardName?.includes("aws-learning")
  );
  console.log(`\nDashboards matching 'aws-learning': ${mine.length}`);
  for (const d of mine) {
    console.log(`  ${d.DashboardName}  (last modified: ${d.LastModified?.toISOString()})`);
  }
}

async function main(): Promise<void> {
  console.log("=== Day 10 - CloudWatch Dashboard ===\n");
  await createDashboard();
  await listDashboards();
  console.log("\nNext: run 'npm run cleanup' to delete all Day 10 resources");
}

main().catch(console.error);
