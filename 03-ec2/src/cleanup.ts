/**
 * DAY 3 — Cleanup: Terminate instance + delete all resources
 *
 * Deletion order matters:
 *   1. Terminate instance   (must finish before security group can be deleted)
 *   2. Deregister AMI       (doesn't depend on instance state)
 *   3. Delete security group (can only delete after instance is terminated)
 *   4. Delete key pair
 *   5. Delete local .pem file
 */

import fs from "fs";
import path from "path";
import {
  DescribeInstancesCommand,
  TerminateInstancesCommand,
  waitUntilInstanceTerminated,
  DescribeImagesCommand,
  DeregisterImageCommand,
  DescribeSecurityGroupsCommand,
  DeleteSecurityGroupCommand,
  DeleteKeyPairCommand,
} from "@aws-sdk/client-ec2";
import { ec2, PREFIX } from "./client";

const KEY_NAME = `${PREFIX}-day03-key`;
const KEY_FILE = path.join(__dirname, "..", `${KEY_NAME}.pem`);

async function terminateInstance(): Promise<void> {
  const resp = await ec2.send(
    new DescribeInstancesCommand({
      Filters: [
        { Name: "tag:project", Values: ["aws-learning"] },
        { Name: "tag:day", Values: ["03"] },
        { Name: "instance-state-name", Values: ["pending", "running", "stopping", "stopped"] },
      ],
    })
  );

  const instance = resp.Reservations?.[0]?.Instances?.[0];
  if (!instance?.InstanceId) {
    console.log("  No active instance found — skipping");
    return;
  }

  const instanceId = instance.InstanceId;
  await ec2.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }));
  console.log(`  Terminating instance: ${instanceId}`);
  console.log("  Waiting for termination (needed before security group can be deleted)...");

  await waitUntilInstanceTerminated(
    { client: ec2, maxWaitTime: 300 },
    { InstanceIds: [instanceId] }
  );
  console.log("  Instance terminated");
}

async function deregisterAmi(): Promise<void> {
  const resp = await ec2.send(
    new DescribeImagesCommand({
      Owners: ["self"],
      Filters: [
        { Name: "tag:project", Values: ["aws-learning"] },
        { Name: "tag:day", Values: ["03"] },
      ],
    })
  );

  if (!resp.Images?.length) {
    console.log("  No AMI found — skipping");
    return;
  }

  for (const image of resp.Images) {
    await ec2.send(new DeregisterImageCommand({ ImageId: image.ImageId }));
    console.log(`  AMI deregistered: ${image.ImageId} (${image.Name})`);
  }
}

async function deleteSecurityGroup(): Promise<void> {
  const resp = await ec2.send(
    new DescribeSecurityGroupsCommand({
      Filters: [
        { Name: "tag:project", Values: ["aws-learning"] },
        { Name: "tag:day", Values: ["03"] },
      ],
    })
  );

  if (!resp.SecurityGroups?.length) {
    console.log("  No security group found — skipping");
    return;
  }

  for (const sg of resp.SecurityGroups) {
    await ec2.send(new DeleteSecurityGroupCommand({ GroupId: sg.GroupId }));
    console.log(`  Security group deleted: ${sg.GroupName} (${sg.GroupId})`);
  }
}

async function deleteKeyPair(): Promise<void> {
  try {
    await ec2.send(new DeleteKeyPairCommand({ KeyName: KEY_NAME }));
    console.log(`  Key pair deleted: ${KEY_NAME}`);
  } catch {
    console.log(`  Key pair not found — skipping`);
  }

  if (fs.existsSync(KEY_FILE)) {
    fs.unlinkSync(KEY_FILE);
    console.log(`  Local key file deleted: ${KEY_FILE}`);
  }
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 3 — EC2 resources ===\n");

  console.log("Step 1: Terminate instance");
  await terminateInstance();

  // Deregister AMI in parallel with waiting — it doesn't depend on instance state
  console.log("\nStep 2: Deregister AMI");
  await deregisterAmi();

  console.log("\nStep 3: Delete security group");
  await deleteSecurityGroup();

  console.log("\nStep 4: Delete key pair");
  await deleteKeyPair();

  console.log("\nAll done! Your AWS account is clean.");
}

main().catch(console.error);
