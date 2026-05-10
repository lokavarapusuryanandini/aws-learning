/**
 * DAY 3 — Task 2: Create an AMI from the running instance
 *
 * Concepts:
 *   - AMI = snapshot of an instance's root volume + launch configuration
 *   - NoReboot: true = create AMI without stopping the instance (slight consistency risk)
 *   - AMI lifecycle: pending → available (can take a few minutes)
 *   - Once you have an AMI you can launch identical instances anywhere in the region
 *   - AMIs are region-specific; copy them to other regions if needed
 */

import {
  DescribeInstancesCommand,
  CreateImageCommand,
  DescribeImagesCommand,
  waitUntilImageAvailable,
} from "@aws-sdk/client-ec2";
import { ec2, PREFIX, DAY_TAGS } from "./client";

const AMI_NAME = `${PREFIX}-day03-snapshot`;

async function findInstance(): Promise<string> {
  const resp = await ec2.send(
    new DescribeInstancesCommand({
      Filters: [
        { Name: "tag:project", Values: ["aws-learning"] },
        { Name: "tag:day", Values: ["03"] },
        // Exclude terminated instances
        { Name: "instance-state-name", Values: ["running", "stopped"] },
      ],
    })
  );
  const instance = resp.Reservations?.[0]?.Instances?.[0];
  if (!instance?.InstanceId) {
    throw new Error("No running Day 3 instance found. Run 'npm run launch' first.");
  }
  console.log(`Found instance: ${instance.InstanceId} (${instance.State?.Name})`);
  return instance.InstanceId;
}

async function createAmi(): Promise<void> {
  console.log("\n--- Creating AMI from running instance ---\n");

  const instanceId = await findInstance();

  // Create AMI without rebooting — fast but filesystem may not be 100% consistent
  // For production backups, stop the instance first for a clean AMI
  const createResp = await ec2.send(
    new CreateImageCommand({
      InstanceId: instanceId,
      Name: AMI_NAME,
      Description: "aws-learning Day 3 - Amazon Linux 2023 + Apache",
      NoReboot: true,
      TagSpecifications: [
        {
          ResourceType: "image",
          Tags: [
            ...DAY_TAGS,
            { Key: "Name", Value: AMI_NAME },
          ],
        },
      ],
    })
  );

  const amiId = createResp.ImageId!;
  console.log(`AMI creation started: ${amiId}`);
  console.log("Waiting for AMI to become available (this takes a few minutes)...");

  // Waiter polls DescribeImages until State = available
  await waitUntilImageAvailable(
    { client: ec2, maxWaitTime: 600 },
    { ImageIds: [amiId] }
  );

  // Fetch final details
  const descResp = await ec2.send(
    new DescribeImagesCommand({ ImageIds: [amiId] })
  );
  const image = descResp.Images![0];

  console.log(`\nAMI is available!`);
  console.log(`  AMI ID:      ${image.ImageId}`);
  console.log(`  Name:        ${image.Name}`);
  console.log(`  State:       ${image.State}`);
  console.log(`  Created:     ${image.CreationDate}`);
  console.log(`\nYou can now launch identical instances from this AMI:`);
  console.log(`  ImageId: "${amiId}" in RunInstancesCommand`);
}

createAmi().catch(console.error);
