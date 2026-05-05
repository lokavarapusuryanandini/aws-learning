/**
 * DAY 1 — Task 3: List IAM resources + simulate a policy
 *
 * Concepts practiced:
 *   - Listing users, roles, policies with pagination
 *   - Policy simulation (would this action be allowed?)
 *   - Understanding policy evaluation order
 */

import {
  ListUsersCommand,
  ListRolesCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  SimulatePrincipalPolicyCommand,
  type SimulatePrincipalPolicyCommandInput,
} from "@aws-sdk/client-iam";
import { iamClient, LEARNING_PREFIX } from "./client";

async function listResources(): Promise<void> {
  console.log("\n=== IAM Resource Inventory ===\n");

  // List users (paginated — real accounts can have hundreds)
  const usersResp = await iamClient.send(new ListUsersCommand({}));
  console.log("Users:");
  usersResp.Users?.forEach((u) => {
    console.log(`  - ${u.UserName} (${u.Arn})`);
  });

  // List roles
  const rolesResp = await iamClient.send(new ListRolesCommand({}));
  const learningRoles = rolesResp.Roles?.filter((r) =>
    r.RoleName?.startsWith(LEARNING_PREFIX)
  );
  console.log(`\nRoles (filtered to '${LEARNING_PREFIX}'):`);
  learningRoles?.forEach((r) => {
    console.log(`  - ${r.RoleName} (${r.Arn})`);
  });

  // List policies attached to our learning user
  const devUser = `${LEARNING_PREFIX}-dev-user`;
  try {
    const [attachedResp, inlineResp] = await Promise.all([
      iamClient.send(new ListAttachedUserPoliciesCommand({ UserName: devUser })),
      iamClient.send(new ListUserPoliciesCommand({ UserName: devUser })),
    ]);
    console.log(`\nPolicies on ${devUser}:`);
    console.log("  Managed:", attachedResp.AttachedPolicies?.map((p) => p.PolicyName));
    console.log("  Inline:", inlineResp.PolicyNames);
  } catch {
    console.log(`\n(User ${devUser} not found — run 'npm run user' first)`);
  }
}

async function simulatePolicy(): Promise<void> {
  console.log("\n=== Policy Simulation ===");
  console.log("(Does the user have permission to perform these actions?)\n");

  const usersResp = await iamClient.send(new ListUsersCommand({}));
  const learningUser = usersResp.Users?.find((u) =>
    u.UserName?.startsWith(LEARNING_PREFIX)
  );

  if (!learningUser) {
    console.log("No learning user found. Run 'npm run user' first.");
    return;
  }

  const params: SimulatePrincipalPolicyCommandInput = {
    PolicySourceArn: learningUser.Arn!,
    ActionNames: [
      "s3:GetObject",        // should be ALLOWED
      "s3:PutObject",        // should be DENIED (not in policy)
      "s3:DeleteObject",     // should be DENIED
      "ec2:DescribeInstances", // should be DENIED
    ],
    ResourceArns: ["arn:aws:s3:::aws-learning-bucket-test/file.txt"],
  };

  const simResp = await iamClient.send(new SimulatePrincipalPolicyCommand(params));

  simResp.EvaluationResults?.forEach((result) => {
    const allowed = result.EvalDecision === "allowed";
    const icon = allowed ? "✓" : "✗";
    console.log(`  ${icon} ${result.EvalActionName}: ${result.EvalDecision}`);
  });

  console.log("\nKey concept: AWS denies by default.");
  console.log("An action is allowed ONLY if there's an explicit Allow with no Deny.");
}

async function main(): Promise<void> {
  await listResources();
  await simulatePolicy();
}

main().catch(console.error);
