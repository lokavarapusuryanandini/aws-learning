/**
 * DAY 11 - Task 1: Deploy a CloudFormation stack
 *
 * Concepts:
 *   - Template = JSON/YAML document describing desired infrastructure (declarative)
 *   - Stack = a deployed instance of a template; CloudFormation manages create/update/delete
 *   - Parameters = values you pass at deploy time to customise the template
 *   - Resources = the AWS resources CloudFormation creates and manages
 *   - Outputs = values the stack exports; viewable in console and importable by other stacks
 *   - Fn::Sub = substitutes ${AWS::AccountId}, ${AWS::Region}, ${StackName} etc.
 *   - Fn::GetAtt = gets an attribute of a resource (e.g. Bucket ARN)
 *   - Ref = returns the primary identifier of a resource (bucket name, param ARN, etc.)
 *   - DeletionPolicy = Retain | Delete | Snapshot (what happens to resource on stack delete)
 *   - Stack status: CREATE_IN_PROGRESS → CREATE_COMPLETE (or CREATE_FAILED)
 */

import {
  CreateStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  waitUntilStackCreateComplete,
} from "@aws-sdk/client-cloudformation";
import { cfn, STACK_NAME, buildTemplate } from "./client";

async function deploy(): Promise<void> {
  // Check if stack already exists
  const existing = await cfn
    .send(new DescribeStacksCommand({ StackName: STACK_NAME }))
    .catch(() => null);
  if (existing?.Stacks?.[0]) {
    console.log(`Stack '${STACK_NAME}' already exists (${existing.Stacks[0].StackStatus})`);
    return;
  }

  console.log(`Creating stack: ${STACK_NAME}`);
  await cfn.send(
    new CreateStackCommand({
      StackName: STACK_NAME,
      TemplateBody: buildTemplate("Enabled"),
      Parameters: [
        { ParameterKey: "VersioningStatus", ParameterValue: "Enabled" },
        { ParameterKey: "Environment",      ParameterValue: "learning" },
      ],
      // Capabilities = acknowledge that the stack may create IAM resources
      // CAPABILITY_IAM or CAPABILITY_NAMED_IAM needed when template includes IAM
      // Not needed here (no IAM resources), but shown for reference
      // Capabilities: ["CAPABILITY_IAM"],
      Tags: [
        { Key: "project", Value: "aws-learning" },
        { Key: "day",     Value: "11" },
      ],
      // OnFailure: ROLLBACK (default), DELETE, or DO_NOTHING
    })
  );

  console.log("Waiting for CREATE_COMPLETE...");
  await waitUntilStackCreateComplete(
    { client: cfn, maxWaitTime: 300 },
    { StackName: STACK_NAME }
  );
  console.log("Stack created");
}

async function describeStack(): Promise<void> {
  const resp = await cfn.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
  const stack = resp.Stacks?.[0];
  if (!stack) return;

  console.log(`\n=== Stack: ${stack.StackName} ===`);
  console.log(`  Status:      ${stack.StackStatus}`);
  console.log(`  Created:     ${stack.CreationTime?.toISOString()}`);
  console.log(`  Description: ${stack.Description}`);

  console.log("\n  Parameters:");
  for (const p of stack.Parameters ?? []) {
    console.log(`    ${p.ParameterKey} = ${p.ParameterValue}`);
  }

  console.log("\n  Outputs:");
  for (const o of stack.Outputs ?? []) {
    console.log(`    ${o.OutputKey} = ${o.OutputValue}`);
    if (o.ExportName) console.log(`      (exported as: ${o.ExportName})`);
  }
}

async function listResources(): Promise<void> {
  const resp = await cfn.send(new ListStackResourcesCommand({ StackName: STACK_NAME }));
  console.log("\n  Resources:");
  for (const r of resp.StackResourceSummaries ?? []) {
    const resourceType = r.ResourceType ?? "<unknown>";
    const logicalId = r.LogicalResourceId ?? "<unknown>";
    const status = r.ResourceStatus ?? "<unknown>";
    console.log(`    ${resourceType.padEnd(35)} ${logicalId.padEnd(25)} ${status}`);
  }
}

async function main(): Promise<void> {
  console.log("=== Day 11 - Deploy CloudFormation Stack ===\n");
  await deploy();
  await describeStack();
  await listResources();
  console.log("\nNext: run 'npm run update' to update the stack via a change set");
}

main().catch(console.error);
