/**
 * DAY 6 - Cleanup: Delete Lambda function + IAM role
 *
 * Deletion order:
 *   1. Delete Lambda function (stops billing immediately)
 *   2. Detach managed policy from the IAM role
 *   3. Delete the IAM role
 *
 * Note: CloudWatch log group (/aws/lambda/<name>) is NOT deleted here.
 * Lambda creates it automatically and it persists after the function is gone.
 * You can delete it manually in the console or via CloudWatch Logs SDK if needed.
 */

import { DeleteFunctionCommand, GetFunctionCommand } from "@aws-sdk/client-lambda";
import {
  GetRoleCommand,
  DetachRolePolicyCommand,
  DeleteRoleCommand,
  ListAttachedRolePoliciesCommand,
} from "@aws-sdk/client-iam";
import {
  lambda,
  iam,
  FUNCTION_NAME,
  ROLE_NAME,
  BASIC_EXECUTION_POLICY,
} from "./client";

async function deleteFunction(): Promise<void> {
  const existing = await lambda
    .send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }))
    .catch(() => null);

  if (!existing) {
    console.log(`  Lambda function '${FUNCTION_NAME}' not found - skipping`);
    return;
  }

  await lambda.send(new DeleteFunctionCommand({ FunctionName: FUNCTION_NAME }));
  console.log(`  Lambda function deleted: ${FUNCTION_NAME}`);
}

async function deleteIamRole(): Promise<void> {
  const existing = await iam
    .send(new GetRoleCommand({ RoleName: ROLE_NAME }))
    .catch(() => null);

  if (!existing?.Role) {
    console.log(`  IAM role '${ROLE_NAME}' not found - skipping`);
    return;
  }

  // Must detach ALL policies before deleting the role
  // List all attached policies first so we don't miss any
  const policiesResp = await iam.send(
    new ListAttachedRolePoliciesCommand({ RoleName: ROLE_NAME })
  );
  const policies = policiesResp.AttachedPolicies ?? [];

  for (const policy of policies) {
    await iam.send(
      new DetachRolePolicyCommand({
        RoleName: ROLE_NAME,
        PolicyArn: policy.PolicyArn!,
      })
    );
    console.log(`  Detached policy: ${policy.PolicyName}`);
  }

  await iam.send(new DeleteRoleCommand({ RoleName: ROLE_NAME }));
  console.log(`  IAM role deleted: ${ROLE_NAME}`);
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 6 - Lambda resources ===\n");

  console.log("Step 1: Delete Lambda function");
  await deleteFunction();

  console.log("\nStep 2: Delete IAM execution role");
  await deleteIamRole();

  console.log("\nAll done! Your AWS account is clean.");
  console.log(
    "\nNote: The CloudWatch log group /aws/lambda/" +
      FUNCTION_NAME +
      " still exists.\n" +
      "Delete it manually in the AWS Console > CloudWatch > Log groups if needed."
  );
}

main().catch(console.error);
