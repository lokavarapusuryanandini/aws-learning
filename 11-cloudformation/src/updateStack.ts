/**
 * DAY 11 - Task 2: Update a stack using a Change Set
 *
 * Concepts:
 *   - Change set = preview of what CloudFormation WILL change before applying
 *   - Actions: Add, Modify, Remove; Scope: Properties, Tags, etc.
 *   - Replacement = True if the resource must be re-created (causes downtime!)
 *   - Always review change sets before executing in production
 *   - Direct update (UpdateStack) applies changes immediately — no preview
 *   - Change set workflow: CreateChangeSet → DescribeChangeSet → ExecuteChangeSet
 *   - Stack status: UPDATE_IN_PROGRESS → UPDATE_COMPLETE
 */

import {
  CreateChangeSetCommand,
  DescribeChangeSetCommand,
  ExecuteChangeSetCommand,
  DescribeStacksCommand,
  waitUntilChangeSetCreateComplete,
  waitUntilStackUpdateComplete,
} from "@aws-sdk/client-cloudformation";
import { cfn, STACK_NAME, buildTemplate } from "./client";

const CHANGE_SET_NAME = `${STACK_NAME}-update-${Date.now()}`;

async function createChangeSet(): Promise<void> {
  console.log(`Creating change set: ${CHANGE_SET_NAME}`);

  // Update: suspend versioning (demonstrates a Modify action on LearningBucket)
  await cfn.send(
    new CreateChangeSetCommand({
      StackName: STACK_NAME,
      ChangeSetName: CHANGE_SET_NAME,
      TemplateBody: buildTemplate("Suspended"), // changed parameter value
      Parameters: [
        { ParameterKey: "VersioningStatus", ParameterValue: "Suspended" }, // changed
        { ParameterKey: "Environment",      UsePreviousValue: true },       // keep existing
      ],
      ChangeSetType: "UPDATE", // UPDATE or CREATE
      Description: "Suspend S3 versioning",
    })
  );

  console.log("Waiting for change set to be computed...");
  await waitUntilChangeSetCreateComplete(
    { client: cfn, maxWaitTime: 120 },
    { StackName: STACK_NAME, ChangeSetName: CHANGE_SET_NAME }
  );
  console.log("Change set ready");
}

async function reviewChangeSet(): Promise<void> {
  const resp = await cfn.send(
    new DescribeChangeSetCommand({ StackName: STACK_NAME, ChangeSetName: CHANGE_SET_NAME })
  );

  console.log(`\n=== Change Set Review: ${CHANGE_SET_NAME} ===`);
  console.log(`  Status: ${resp.Status}`);
  console.log(`  Changes:`);

  for (const change of resp.Changes ?? []) {
    const rc = change.ResourceChange!;
    const replacement = rc.Replacement === "True" ? "  ⚠ REPLACEMENT" : "";
    console.log(
      `    ${rc.Action?.padEnd(6)} ${rc.ResourceType?.padEnd(35)} ${rc.LogicalResourceId}${replacement}`
    );
    for (const detail of rc.Details ?? []) {
      console.log(
        `      └ ${detail.Target?.Attribute} ${detail.Target?.Name} (${detail.ChangeSource})`
      );
    }
  }
}

async function executeChangeSet(): Promise<void> {
  console.log("\nExecuting change set...");
  await cfn.send(
    new ExecuteChangeSetCommand({ StackName: STACK_NAME, ChangeSetName: CHANGE_SET_NAME })
  );

  console.log("Waiting for UPDATE_COMPLETE...");
  await waitUntilStackUpdateComplete(
    { client: cfn, maxWaitTime: 300 },
    { StackName: STACK_NAME }
  );
  console.log("Stack updated");
}

async function main(): Promise<void> {
  console.log("=== Day 11 - Update Stack via Change Set ===\n");

  // Make sure stack exists first
  const existing = await cfn
    .send(new DescribeStacksCommand({ StackName: STACK_NAME }))
    .catch(() => null);
  if (!existing?.Stacks?.[0]) {
    console.log(`Stack '${STACK_NAME}' not found. Run 'npm run deploy' first.`);
    return;
  }

  await createChangeSet();
  await reviewChangeSet();
  await executeChangeSet();
  console.log("\nNext: run 'npm run drift' to detect stack drift");
}

main().catch(console.error);
