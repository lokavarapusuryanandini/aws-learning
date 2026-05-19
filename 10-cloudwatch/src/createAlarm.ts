/**
 * DAY 10 - Task 2: CloudWatch Alarms
 *
 * Concepts:
 *   - Alarm = monitors a metric and changes state when threshold is crossed
 *   - States: OK (metric is fine), ALARM (threshold breached), INSUFFICIENT_DATA (not enough data)
 *   - Period = evaluation window in seconds (60, 300, etc.)
 *   - EvaluationPeriods = how many consecutive periods must breach before ALARM state
 *   - DatapointsToAlarm = out of EvaluationPeriods, how many must breach (for M out of N alarms)
 *   - Threshold + ComparisonOperator = the condition (e.g. > 500ms)
 *   - TreatMissingData = what to do if no data: notBreaching, breaching, ignore, missing
 *   - AlarmActions = SNS topic ARNs to notify when alarm fires (or OKActions, InsufficientDataActions)
 *   - SetAlarmState = manually override state (useful for testing notification integrations)
 *   - Composite alarm = alarm whose condition is based on other alarms (AND/OR logic)
 */

import {
  PutMetricAlarmCommand,
  DescribeAlarmsCommand,
  SetAlarmStateCommand,
  ComparisonOperator,
  Statistic,
  StateValue,
} from "@aws-sdk/client-cloudwatch";
import { cw, NAMESPACE, ALARM_NAME } from "./client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function createAlarm(): Promise<void> {
  console.log(`Creating alarm: ${ALARM_NAME}`);

  await cw.send(
    new PutMetricAlarmCommand({
      AlarmName: ALARM_NAME,
      AlarmDescription: "aws-learning Day 10 - fires when avg API latency > 500ms",
      Namespace: NAMESPACE,
      MetricName: "ApiLatency",
      Dimensions: [
        { Name: "service",     Value: "api" },
        { Name: "environment", Value: "learning" },
      ],
      Statistic: Statistic.Average,
      Period: 60,                    // 60-second evaluation window
      EvaluationPeriods: 2,          // look at 2 consecutive periods
      DatapointsToAlarm: 2,          // both must breach (2 out of 2)
      Threshold: 500,                // 500ms
      ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
      TreatMissingData: "notBreaching", // missing data = OK (don't alarm on empty metric)
      // AlarmActions: ["arn:aws:sns:us-east-1:123:my-topic"], // notify via SNS when ALARM
      // OKActions:    ["arn:aws:sns:us-east-1:123:my-topic"], // notify when back to OK
      Tags: [{ Key: "project", Value: "aws-learning" }, { Key: "day", Value: "10" }],
    })
  );
  console.log("Alarm created");
}

async function createP99Alarm(): Promise<void> {
  // Extended statistics alarm — P99 latency > 1000ms
  // Useful for catching tail latency that averages might miss
  await cw.send(
    new PutMetricAlarmCommand({
      AlarmName: `${ALARM_NAME}-p99`,
      AlarmDescription: "aws-learning Day 10 - fires when P99 latency > 1000ms",
      Namespace: NAMESPACE,
      MetricName: "ApiLatency",
      Dimensions: [
        { Name: "service",     Value: "api" },
        { Name: "environment", Value: "learning" },
      ],
      ExtendedStatistic: "p99", // p99, p95, p50, etc. (extended statistics)
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 1000,
      ComparisonOperator: ComparisonOperator.GreaterThanThreshold,
      TreatMissingData: "notBreaching",
    })
  );
  console.log("P99 alarm created");
}

async function describeAlarms(): Promise<void> {
  const resp = await cw.send(
    new DescribeAlarmsCommand({ AlarmNamePrefix: "aws-learning-day10" })
  );
  console.log(`\nAlarms (${resp.MetricAlarms?.length ?? 0} total):`);
  for (const alarm of resp.MetricAlarms ?? []) {
    const stateColor =
      alarm.StateValue === "OK" ? "\x1b[32m" :
      alarm.StateValue === "ALARM" ? "\x1b[31m" : "\x1b[33m";
    console.log(
      `  ${alarm.AlarmName}\n` +
      `    State:     ${stateColor}${alarm.StateValue}\x1b[0m\n` +
      `    Condition: ${alarm.Statistic ?? alarm.ExtendedStatistic} ${alarm.MetricName} ` +
      `${alarm.ComparisonOperator} ${alarm.Threshold}\n` +
      `    Reason:    ${alarm.StateReason}`
    );
  }
}

async function demoStateTransition(): Promise<void> {
  console.log("\n--- Demo: manually force ALARM state ---");
  console.log("(In production, the state changes automatically when the metric crosses the threshold)\n");

  // Force to ALARM state to demonstrate notification flow
  await cw.send(
    new SetAlarmStateCommand({
      AlarmName: ALARM_NAME,
      StateValue: StateValue.ALARM,
      StateReason: "Manual test: simulating high latency spike",
      StateReasonData: JSON.stringify({ threshold: 500, evaluatedValue: 750 }),
    })
  );
  console.log("Alarm state set to ALARM");
  await sleep(1000);

  await describeAlarms();

  // Reset to OK
  await sleep(1000);
  await cw.send(
    new SetAlarmStateCommand({
      AlarmName: ALARM_NAME,
      StateValue: StateValue.OK,
      StateReason: "Manual reset: latency back to normal",
    })
  );
  console.log("\nAlarm state reset to OK");
}

async function main(): Promise<void> {
  console.log("=== Day 10 - CloudWatch Alarms ===\n");
  await createAlarm();
  await createP99Alarm();
  await describeAlarms();
  await demoStateTransition();
  console.log("\nNext: run 'npm run logs' to see CloudWatch Logs Insights");
}

main().catch(console.error);
