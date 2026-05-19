/**
 * DAY 7 - Cleanup
 *
 * Deletion order:
 *   1. Delete REST API (removes all resources, methods, stages, deployments in one call)
 *   2. Remove Lambda permission (actually deleted with the function, but explicit is cleaner)
 *   3. Delete Lambda function
 *   4. Detach policies + delete IAM role
 */

import {
  GetRestApisCommand,
  DeleteRestApiCommand,
} from "@aws-sdk/client-api-gateway";
import {
  GetFunctionCommand,
  DeleteFunctionCommand,
} from "@aws-sdk/client-lambda";
import {
  GetRoleCommand,
  ListAttachedRolePoliciesCommand,
  DetachRolePolicyCommand,
  DeleteRoleCommand,
} from "@aws-sdk/client-iam";
import { apigw, lambdaClient, iam, API_NAME, FUNCTION_NAME, ROLE_NAME } from "./client";

async function deleteApi(): Promise<void> {
  const resp = await apigw.send(new GetRestApisCommand({ limit: 500 }));
  const api = (resp.items ?? []).find((a) => a.name === API_NAME);
  if (!api?.id) {
    console.log(`  REST API '${API_NAME}' not found - skipping`);
    return;
  }
  await apigw.send(new DeleteRestApiCommand({ restApiId: api.id }));
  console.log(`  REST API deleted: ${API_NAME} (${api.id})`);
}

async function deleteLambda(): Promise<void> {
  const existing = await lambdaClient
    .send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }))
    .catch(() => null);
  if (!existing) {
    console.log(`  Lambda function '${FUNCTION_NAME}' not found - skipping`);
    return;
  }
  await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: FUNCTION_NAME }));
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
  const policies = await iam.send(
    new ListAttachedRolePoliciesCommand({ RoleName: ROLE_NAME })
  );
  for (const p of policies.AttachedPolicies ?? []) {
    await iam.send(
      new DetachRolePolicyCommand({ RoleName: ROLE_NAME, PolicyArn: p.PolicyArn! })
    );
    console.log(`  Detached policy: ${p.PolicyName}`);
  }
  await iam.send(new DeleteRoleCommand({ RoleName: ROLE_NAME }));
  console.log(`  IAM role deleted: ${ROLE_NAME}`);
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 7 - API Gateway resources ===\n");

  console.log("Step 1: Delete REST API");
  await deleteApi();

  console.log("\nStep 2: Delete Lambda function");
  await deleteLambda();

  console.log("\nStep 3: Delete IAM role");
  await deleteIamRole();

  console.log("\nAll done! Your AWS account is clean.");
}

main().catch(console.error);
