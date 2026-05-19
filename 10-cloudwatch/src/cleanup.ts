/**
 * DAY 10 - Cleanup: Delete alarms, log group, and dashboard
 */

import {
  DescribeAlarmsCommand,
  DeleteAlarmsCommand,
  DeleteDashboardsCommand,
} from "@aws-sdk/client-cloudwatch";
import { DeleteLogGroupCommand } from "@aws-sdk/client-cloudwatch-logs";
import { cw, cwLogs, ALARM_NAME, LOG_GROUP, DASHBOARD_NAME } from "./client";

async function deleteAlarms(): Promise<void> {
  console.log("Deleting alarms...");
  const resp = await cw.send(
    new DescribeAlarmsCommand({ AlarmNamePrefix: "aws-learning-day10" })
  );
  const names = (resp.MetricAlarms ?? []).map((a) => a.AlarmName!);
  if (names.length === 0) { console.log("  None found"); return; }
  await cw.send(new DeleteAlarmsCommand({ AlarmNames: names }));
  names.forEach((n) => console.log(`  Deleted: ${n}`));
}

async function deleteLogGroup(): Promise<void> {
  console.log("\nDeleting log group...");
  await cwLogs
    .send(new DeleteLogGroupCommand({ logGroupName: LOG_GROUP }))
    .then(() => console.log(`  Deleted: ${LOG_GROUP}`))
    .catch((e) => {
      if (e.name === "ResourceNotFoundException") console.log("  Not found - skipping");
      else throw e;
    });
}

async function deleteDashboard(): Promise<void> {
  console.log("\nDeleting dashboard...");
  await cw
    .send(new DeleteDashboardsCommand({ DashboardNames: [DASHBOARD_NAME] }))
    .then(() => console.log(`  Deleted: ${DASHBOARD_NAME}`))
    .catch((e) => {
      if (e.name === "DashboardNotFoundError") console.log("  Not found - skipping");
      else throw e;
    });
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 10 - CloudWatch resources ===\n");
  await deleteAlarms();
  await deleteLogGroup();
  await deleteDashboard();
  console.log("\nAll done!");
}

main().catch(console.error);
