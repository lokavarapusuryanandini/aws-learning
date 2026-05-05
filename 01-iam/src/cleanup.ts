/**
 * DAY 1 — Cleanup: Delete all resources created today
 * Always clean up to avoid surprise costs and clutter!
 */

import {
  DeleteAccessKeyCommand,
  ListAccessKeysCommand,
  DeleteUserPolicyCommand,
  DetachUserPolicyCommand,
  ListAttachedUserPoliciesCommand,
  DeleteUserCommand,
  ListRolePoliciesCommand,
  DeleteRolePolicyCommand,
  ListAttachedRolePoliciesCommand,
  DetachRolePolicyCommand,
  DeleteRoleCommand,
} from "@aws-sdk/client-iam";
import { iamClient, LEARNING_PREFIX } from "./client";

const USERNAME = `${LEARNING_PREFIX}-dev-user`;
const ROLE_NAME = `${LEARNING_PREFIX}-lambda-execution-role`;

async function cleanupUser(): Promise<void> {
  console.log(`\nCleaning up user: ${USERNAME}`);
  try {
    // Must delete access keys before deleting user
    const keysResp = await iamClient.send(new ListAccessKeysCommand({ UserName: USERNAME }));
    for (const key of keysResp.AccessKeyMetadata ?? []) {
      await iamClient.send(new DeleteAccessKeyCommand({ UserName: USERNAME, AccessKeyId: key.AccessKeyId }));
      console.log("  Deleted access key:", key.AccessKeyId);
    }
    // Delete inline policies
    await iamClient.send(new DeleteUserPolicyCommand({ UserName: USERNAME, PolicyName: "S3ReadOnlyLearning" }));
    console.log("  Deleted inline policy");
    // Detach managed policies
    const attached = await iamClient.send(new ListAttachedUserPoliciesCommand({ UserName: USERNAME }));
    for (const p of attached.AttachedPolicies ?? []) {
      await iamClient.send(new DetachUserPolicyCommand({ UserName: USERNAME, PolicyArn: p.PolicyArn }));
    }
    // Delete user
    await iamClient.send(new DeleteUserCommand({ UserName: USERNAME }));
    console.log("  User deleted");
  } catch (e: any) {
    console.log("  Skipped (not found or already deleted):", e.message);
  }
}

async function cleanupRole(): Promise<void> {
  console.log(`\nCleaning up role: ${ROLE_NAME}`);
  try {
    // Delete inline policies
    const inlineResp = await iamClient.send(new ListRolePoliciesCommand({ RoleName: ROLE_NAME }));
    for (const name of inlineResp.PolicyNames ?? []) {
      await iamClient.send(new DeleteRolePolicyCommand({ RoleName: ROLE_NAME, PolicyName: name }));
      console.log("  Deleted inline policy:", name);
    }
    // Detach managed policies
    const attachedResp = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: ROLE_NAME }));
    for (const p of attachedResp.AttachedPolicies ?? []) {
      await iamClient.send(new DetachRolePolicyCommand({ RoleName: ROLE_NAME, PolicyArn: p.PolicyArn }));
      console.log("  Detached managed policy:", p.PolicyName);
    }
    // Delete role
    await iamClient.send(new DeleteRoleCommand({ RoleName: ROLE_NAME }));
    console.log("  Role deleted");
  } catch (e: any) {
    console.log("  Skipped:", e.message);
  }
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 1 — IAM resources ===");
  await cleanupUser();
  await cleanupRole();
  console.log("\nAll done! Your AWS account is clean.");
}

main().catch(console.error);
