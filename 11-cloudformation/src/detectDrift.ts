/**
 * DAY 11 - Task 3: Detect stack drift
 *
 * Concepts:
 *   - Drift = a resource's actual configuration differs from what CloudFormation expects
 *   - Causes: manual changes in console/CLI/SDK outside of CloudFormation
 *   - Drift status: IN_SYNC | MODIFIED | DELETED | NOT_CHECKED
 *   - Stack drift status: DRIFTED (at least one resource drifted) | IN_SYNC | NOT_CHECKED
 *   - Detection is async: trigger → poll until DETECTION_COMPLETE
 *   - After detection you can see which properties changed (expected vs actual)
 *   - Fix: run a stack update to bring resources back in line with the template
 *   - Prevention: CloudFormation StackSets + Service Control Policies in AWS Organizations
 */

import {
  DetectStackDriftCommand,
  DescribeStackDriftDetectionStatusCommand,
  DescribeStackResourceDriftsCommand,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { cfn, STACK_NAME } from "./client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function detectDrift(): Promise<string> {
  console.log(`Triggering drift detection for stack: ${STACK_NAME}`);
  const resp = await cfn.send(new DetectStackDriftCommand({ StackName: STACK_NAME }));
  const detectionId = resp.StackDriftDetectionId!;
  console.log(`  Detection ID: ${detectionId}`);
  return detectionId;
}

async function waitForDetection(detectionId: string): Promise<void> {
  console.log("Polling for detection to complete...");
  while (true) {
    const resp = await cfn.send(
      new DescribeStackDriftDetectionStatusCommand({
        StackDriftDetectionId: detectionId,
      })
    );
    const status = resp.DetectionStatus;
    process.stdout.write(`  Status: ${status}\r`);

    if (status === "DETECTION_COMPLETE" || status === "DETECTION_FAILED") {
      process.stdout.write("\n");
      console.log(`  Stack drift status: ${resp.StackDriftStatus}`);
      console.log(`  Drifted resources:  ${resp.DriftedStackResourceCount ?? 0}`);
      break;
    }
    await sleep(3000);
  }
}

async function showDriftResults(): Promise<void> {
  const resp = await cfn.send(
    new DescribeStackResourceDriftsCommand({
      StackName: STACK_NAME,
      // StackResourceDriftStatusFilters: ["MODIFIED", "DELETED"] // only show drifted
    })
  );

  const drifts = resp.StackResourceDrifts ?? [];
  console.log(`\nDrift results (${drifts.length} resources checked):`);
  for (const d of drifts) {
    const icon = d.StackResourceDriftStatus === "IN_SYNC" ? "OK " : "DRIFT";
    console.log(`  [${icon}] ${d.ResourceType?.padEnd(30)} ${d.LogicalResourceId}`);
    if (d.StackResourceDriftStatus !== "IN_SYNC" && d.ExpectedProperties) {
      console.log(`     Expected: ${d.ExpectedProperties}`);
      console.log(`     Actual:   ${d.ActualProperties}`);
    }
  }

  const stack = await cfn.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
  const driftStatus = stack.Stacks?.[0]?.DriftInformation?.StackDriftStatus;
  console.log(`\nOverall stack drift status: ${driftStatus}`);

  if (driftStatus === "IN_SYNC") {
    console.log("  All resources match the template — no drift detected.");
  } else {
    console.log("  Drift detected! Possible fixes:");
    console.log("    1. Re-run 'npm run update' to bring resources back in line with template");
    console.log("    2. Update the template to reflect the intentional change");
  }
}

async function main(): Promise<void> {
  console.log("=== Day 11 - Drift Detection ===\n");

  const existing = await cfn
    .send(new DescribeStacksCommand({ StackName: STACK_NAME }))
    .catch(() => null);
  if (!existing?.Stacks?.[0]) {
    console.log(`Stack '${STACK_NAME}' not found. Run 'npm run deploy' first.`);
    return;
  }

  console.log(
    "Tip: to see DRIFTED status, manually change the S3 bucket tags in the console,\n" +
    "then re-run this script.\n"
  );

  const detectionId = await detectDrift();
  await waitForDetection(detectionId);
  await showDriftResults();
  console.log("\nNext: run 'npm run cleanup' to delete the stack");
}

main().catch(console.error);
