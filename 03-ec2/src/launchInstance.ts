/**
 * DAY 3 — Task 1: Launch an EC2 instance
 *
 * Concepts:
 *   - AMI (Amazon Machine Image) = OS template; always use latest, never hardcode
 *   - Key pair = SSH credentials; private key is shown ONCE — save it immediately
 *   - Security group = stateful virtual firewall (inbound + outbound rules)
 *   - User data = bootstrap script that runs as root on first boot
 *   - Instance types: t3.micro = 2 vCPU, 1 GB RAM (current free-tier eligible on new accounts)
 *   - Public IP is assigned automatically in the default VPC
 */

import fs from "fs";
import path from "path";
import {
  CreateKeyPairCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  DescribeImagesCommand,
  RunInstancesCommand,
  DescribeInstancesCommand,
  waitUntilInstanceRunning,
} from "@aws-sdk/client-ec2";
import { ec2, PREFIX, DAY_TAGS } from "./client";

const KEY_NAME = `${PREFIX}-day03-key`;
const SG_NAME = `${PREFIX}-day03-sg`;
const KEY_FILE = path.join(__dirname, "..", `${KEY_NAME}.pem`);

// Bootstrap script — installs Apache and serves a simple page
// Runs as root on first boot; takes ~1 min after instance is "running"
const USER_DATA = Buffer.from(`#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
echo "<h1>Hello from AWS Learning — Day 3 EC2</h1>" > /var/www/html/index.html
`).toString("base64");

async function getLatestAmazonLinuxAmi(): Promise<string> {
  // Always resolve AMI ID dynamically — IDs change per region and over time
  const resp = await ec2.send(
    new DescribeImagesCommand({
      Owners: ["amazon"],
      Filters: [
        { Name: "name", Values: ["al2023-ami-2023*-x86_64"] },
        { Name: "state", Values: ["available"] },
        { Name: "architecture", Values: ["x86_64"] },
      ],
    })
  );
  const sorted = (resp.Images ?? []).sort(
    (a, b) =>
      new Date(b.CreationDate!).getTime() - new Date(a.CreationDate!).getTime()
  );
  if (!sorted[0]?.ImageId) throw new Error("No Amazon Linux 2023 AMI found");
  console.log(`Using AMI: ${sorted[0].ImageId} (${sorted[0].Name})`);
  return sorted[0].ImageId;
}

async function createKeyPair(): Promise<void> {
  const resp = await ec2.send(
    new CreateKeyPairCommand({
      KeyName: KEY_NAME,
      TagSpecifications: [
        { ResourceType: "key-pair", Tags: DAY_TAGS },
      ],
    })
  );
  // Private key is returned ONLY at creation time — write it to disk immediately
  fs.writeFileSync(KEY_FILE, resp.KeyMaterial!, { mode: 0o400 }); // chmod 400
  console.log(`Key pair created: ${KEY_NAME}`);
  console.log(`Private key saved to: ${KEY_FILE}`);
}

async function createSecurityGroup(): Promise<string> {
  const createResp = await ec2.send(
    new CreateSecurityGroupCommand({
      GroupName: SG_NAME,
      Description: "aws-learning day 03 - SSH + HTTP",
      TagSpecifications: [
        { ResourceType: "security-group", Tags: DAY_TAGS },
      ],
    })
  );
  const sgId = createResp.GroupId!;

  // Allow inbound SSH (port 22) and HTTP (port 80) from anywhere
  // In production: restrict SSH to your IP (never 0.0.0.0/0)
  await ec2.send(
    new AuthorizeSecurityGroupIngressCommand({
      GroupId: sgId,
      IpPermissions: [
        {
          IpProtocol: "tcp",
          FromPort: 22,
          ToPort: 22,
          IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "SSH (restrict to your IP in production)" }],
        },
        {
          IpProtocol: "tcp",
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "HTTP" }],
        },
      ],
    })
  );
  console.log(`Security group created: ${SG_NAME} (${sgId})`);
  return sgId;
}

async function launchInstance(): Promise<void> {
  console.log("\n--- Launching EC2 Instance ---\n");

  const amiId = await getLatestAmazonLinuxAmi();
  await createKeyPair();
  const sgId = await createSecurityGroup();

  // Launch the instance
  const runResp = await ec2.send(
    new RunInstancesCommand({
      ImageId: amiId,
      InstanceType: "t3.micro", // 2 vCPU, 1 GB RAM — free-tier eligible on new accounts
      MinCount: 1,
      MaxCount: 1,
      KeyName: KEY_NAME,
      SecurityGroupIds: [sgId],
      UserData: USER_DATA,
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            ...DAY_TAGS,
            { Key: "Name", Value: `${PREFIX}-day03-instance` },
          ],
        },
      ],
    })
  );

  const instanceId = runResp.Instances![0].InstanceId!;
  console.log(`\nInstance launched: ${instanceId}`);
  console.log("Waiting for instance to reach 'running' state...");

  // Wait until the instance is running (polls DescribeInstances internally)
  await waitUntilInstanceRunning(
    { client: ec2, maxWaitTime: 120 },
    { InstanceIds: [instanceId] }
  );

  // Fetch public IP (only available after running)
  const descResp = await ec2.send(
    new DescribeInstancesCommand({ InstanceIds: [instanceId] })
  );
  const instance = descResp.Reservations![0].Instances![0];
  const publicIp = instance.PublicIpAddress;

  console.log(`\nInstance is running!`);
  console.log(`  Instance ID: ${instanceId}`);
  console.log(`  Public IP:   ${publicIp}`);
  console.log(`  State:       ${instance.State?.Name}`);
  console.log(`\nSSH into instance (once ready):`);
  console.log(`  ssh -i ${KEY_FILE} ec2-user@${publicIp}`);
  console.log(`\nHTTP (after user-data finishes ~1 min):`);
  console.log(`  curl http://${publicIp}`);
  console.log(`  or open http://${publicIp} in your browser`);
}

launchInstance().catch(console.error);
