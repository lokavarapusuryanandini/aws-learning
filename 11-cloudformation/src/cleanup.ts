/**
 * DAY 11 - Cleanup: Delete the CloudFormation stack
 *
 * DeleteStack removes the stack and all its resources (unless DeletionPolicy: Retain).
 * waitUntilStackDeleteComplete polls until the stack no longer exists.
 */

import {
  DeleteStackCommand,
  DescribeStacksCommand,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";
import { cfn, STACK_NAME } from "./client";

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 11 - CloudFormation stack ===\n");

  const existing = await cfn
    .send(new DescribeStacksCommand({ StackName: STACK_NAME }))
    .catch(() => null);

  if (!existing?.Stacks?.[0]) {
    console.log(`Stack '${STACK_NAME}' not found - nothing to delete`);
    return;
  }

  const status = existing.Stacks[0].StackStatus;
  console.log(`Deleting stack: ${STACK_NAME} (current status: ${status})`);

  await cfn.send(new DeleteStackCommand({ StackName: STACK_NAME }));

  console.log("Waiting for DELETE_COMPLETE...");
  await waitUntilStackDeleteComplete(
    { client: cfn, maxWaitTime: 300 },
    { StackName: STACK_NAME }
  );

  console.log("Stack deleted");
  console.log(
    "\nNote: If deletion failed, the S3 bucket may have objects in it.\n" +
    "Empty the bucket in the console, then delete the stack manually."
  );
}

main().catch(console.error);
