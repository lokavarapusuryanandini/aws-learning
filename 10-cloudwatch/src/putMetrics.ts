/**
 * DAY 10 - Task 1: Publish custom metrics to CloudWatch
 *
 * Concepts:
 *   - Namespace = logical grouping for metrics (e.g. "MyApp/Production")
 *   - Metric = a time-series of values (e.g. "ApiLatency")
 *   - Dimension = key-value pair that further qualifies a metric
 *     (e.g. service=api, endpoint=/orders — same metric name, different dimensions)
 *   - Unit = the unit of measurement (Milliseconds, Count, Bytes, Percent, etc.)
 *   - Datapoint = a single {Timestamp, Value, Unit} for a metric
 *   - Resolution = StandardResolution (60s) or HighResolution (1s; extra cost)
 *   - Retention = CloudWatch keeps 1s data for 3 hours, 60s data for 15 days, etc.
 *   - GetMetricData = query metrics with statistics (Average, Sum, p99, etc.)
 */

import {
  PutMetricDataCommand,
  GetMetricDataCommand,
  StandardUnit,
  Statistic,
} from "@aws-sdk/client-cloudwatch";
import { cw, NAMESPACE } from "./client";

// Simulate 10 minutes of application metrics
function generateDatapoints(baseLatency: number, errorRate: number, count: number) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    latency: baseLatency + Math.random() * 200 - 100, // ±100ms jitter
    errors: Math.random() < errorRate ? 1 : 0,
    requests: Math.floor(Math.random() * 50) + 10,
    timestamp: new Date(now - (count - i) * 60_000), // one per minute
  }));
}

async function putMetrics(): Promise<void> {
  console.log(`Publishing metrics to namespace: ${NAMESPACE}\n`);

  const datapoints = generateDatapoints(250, 0.1, 10);

  // CloudWatch accepts up to 1000 metric data in one call
  // Group by MetricName for readability
  for (const dp of datapoints) {
    await cw.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: "ApiLatency",
            Value: dp.latency,
            Unit: StandardUnit.Milliseconds,
            Timestamp: dp.timestamp,
            // Dimensions slice the metric so you can query by service/environment
            Dimensions: [
              { Name: "service",     Value: "api" },
              { Name: "environment", Value: "learning" },
            ],
          },
          {
            MetricName: "ErrorCount",
            Value: dp.errors,
            Unit: StandardUnit.Count,
            Timestamp: dp.timestamp,
            Dimensions: [
              { Name: "service",     Value: "api" },
              { Name: "environment", Value: "learning" },
            ],
          },
          {
            MetricName: "RequestCount",
            Value: dp.requests,
            Unit: StandardUnit.Count,
            Timestamp: dp.timestamp,
            Dimensions: [
              { Name: "service",     Value: "api" },
              { Name: "environment", Value: "learning" },
            ],
          },
        ],
      })
    );
  }

  console.log(`Published ${datapoints.length} datapoints for each of 3 metrics`);
  console.log("  ApiLatency    (ms)   — simulated ~250ms ±100ms jitter");
  console.log("  ErrorCount    (count) — ~10% error rate");
  console.log("  RequestCount  (count) — 10-60 requests/minute");
}

async function queryMetrics(): Promise<void> {
  console.log("\nQuerying metrics back with GetMetricData...\n");

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 15 * 60_000); // last 15 minutes

  const resp = await cw.send(
    new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: "latency",
          MetricStat: {
            Metric: {
              Namespace: NAMESPACE,
              MetricName: "ApiLatency",
              Dimensions: [
                { Name: "service",     Value: "api" },
                { Name: "environment", Value: "learning" },
              ],
            },
            Period: 60,              // aggregate into 60s buckets
            Stat: Statistic.Average, // Average, Sum, Min, Max, SampleCount, p99, etc.
          },
          Label: "Avg Latency (ms)",
        },
        {
          Id: "errors",
          MetricStat: {
            Metric: {
              Namespace: NAMESPACE,
              MetricName: "ErrorCount",
              Dimensions: [
                { Name: "service",     Value: "api" },
                { Name: "environment", Value: "learning" },
              ],
            },
            Period: 60,
            Stat: Statistic.Sum,
          },
          Label: "Total Errors",
        },
        {
          // Math expression: error rate = errors / requests * 100
          Id: "errorRate",
          Expression: "(errors / requests) * 100",
          Label: "Error Rate (%)",
        },
        {
          Id: "requests",
          MetricStat: {
            Metric: {
              Namespace: NAMESPACE,
              MetricName: "RequestCount",
              Dimensions: [
                { Name: "service",     Value: "api" },
                { Name: "environment", Value: "learning" },
              ],
            },
            Period: 60,
            Stat: Statistic.Sum,
          },
          Label: "Total Requests",
          ReturnData: false, // used in the math expression but not printed
        },
      ],
    })
  );

  for (const result of resp.MetricDataResults ?? []) {
    console.log(`${result.Label}:`);
    const values = result.Values ?? [];
    if (values.length === 0) {
      console.log("  (no data yet — metrics may take a minute to appear)");
    } else {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      console.log(`  Points: ${values.length}, Avg: ${avg.toFixed(2)}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("=== Day 10 - CloudWatch Custom Metrics ===\n");
  await putMetrics();
  await queryMetrics();
  console.log("\nNext: run 'npm run alarm' to create a metric alarm");
}

main().catch(console.error);
