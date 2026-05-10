/**
 * DAY 4 — Task 2: Create public and private subnets
 *
 * Concepts:
 *   - Subnet = a slice of VPC IP space, locked to one Availability Zone
 *   - Public subnet  = has a route to IGW; instances can reach/be reached from internet
 *   - Private subnet = no route to IGW; instances can only talk within VPC
 *                      (or via NAT Gateway for outbound-only internet — costs money)
 *   - AZ spreading = put subnets in different AZs for high availability
 *   - Auto-assign public IP = public subnet instances get a public IP automatically
 *   - Route table association = what makes a subnet public vs private
 */

import {
  DescribeVpcsCommand,
  DescribeRouteTablesCommand,
  CreateSubnetCommand,
  ModifySubnetAttributeCommand,
  AssociateRouteTableCommand,
} from "@aws-sdk/client-ec2";
import { ec2, PREFIX, DAY_TAGS } from "./client";

async function findVpcId(): Promise<string> {
  const resp = await ec2.send(
    new DescribeVpcsCommand({
      Filters: [
        { Name: "tag:project", Values: ["aws-learning"] },
        { Name: "tag:day", Values: ["04"] },
        { Name: "state", Values: ["available"] },
      ],
    })
  );
  const vpc = resp.Vpcs?.[0];
  if (!vpc?.VpcId) throw new Error("No Day 4 VPC found. Run 'npm run vpc' first.");
  console.log(`Found VPC: ${vpc.VpcId} (${vpc.CidrBlock})`);
  return vpc.VpcId;
}

async function findPublicRouteTable(vpcId: string): Promise<string> {
  const resp = await ec2.send(
    new DescribeRouteTablesCommand({
      Filters: [
        { Name: "vpc-id", Values: [vpcId] },
        { Name: "tag:project", Values: ["aws-learning"] },
        { Name: "tag:day", Values: ["04"] },
      ],
    })
  );
  const rt = resp.RouteTables?.[0];
  if (!rt?.RouteTableId) throw new Error("No Day 4 route table found. Run 'npm run vpc' first.");
  return rt.RouteTableId;
}

async function createSubnets(): Promise<void> {
  console.log("\n--- Creating Subnets ---\n");

  const vpcId = await findVpcId();
  const publicRtId = await findPublicRouteTable(vpcId);

  // PUBLIC SUBNET — us-east-1a
  // Instances here get a public IP and can reach the internet via IGW
  const publicSubnetResp = await ec2.send(
    new CreateSubnetCommand({
      VpcId: vpcId,
      CidrBlock: "10.0.0.0/24", // 256 IPs (251 usable — AWS reserves 5 per subnet)
      AvailabilityZone: "us-east-1a",
      TagSpecifications: [
        {
          ResourceType: "subnet",
          Tags: [
            ...DAY_TAGS,
            { Key: "Name", Value: `${PREFIX}-day04-public-1a` },
            { Key: "type", Value: "public" },
          ],
        },
      ],
    })
  );
  const publicSubnetId = publicSubnetResp.Subnet!.SubnetId!;
  console.log(`Public subnet created: ${publicSubnetId} (10.0.0.0/24, us-east-1a)`);

  // Enable auto-assign public IP — instances launched here get a public IP automatically
  await ec2.send(
    new ModifySubnetAttributeCommand({
      SubnetId: publicSubnetId,
      MapPublicIpOnLaunch: { Value: true },
    })
  );
  console.log("Auto-assign public IP enabled on public subnet");

  // Associate public subnet with the public route table (has 0.0.0.0/0 -> IGW)
  // Without this, the subnet uses the VPC's main (local-only) route table
  await ec2.send(
    new AssociateRouteTableCommand({
      SubnetId: publicSubnetId,
      RouteTableId: publicRtId,
    })
  );
  console.log("Public subnet associated with public route table");

  // PRIVATE SUBNET — us-east-1b (different AZ for HA)
  // No route table association = uses VPC main route table = local traffic only
  // For outbound internet access from private subnets, you'd add a NAT Gateway
  const privateSubnetResp = await ec2.send(
    new CreateSubnetCommand({
      VpcId: vpcId,
      CidrBlock: "10.0.1.0/24", // 256 IPs in a different range
      AvailabilityZone: "us-east-1b",
      TagSpecifications: [
        {
          ResourceType: "subnet",
          Tags: [
            ...DAY_TAGS,
            { Key: "Name", Value: `${PREFIX}-day04-private-1b` },
            { Key: "type", Value: "private" },
          ],
        },
      ],
    })
  );
  const privateSubnetId = privateSubnetResp.Subnet!.SubnetId!;
  console.log(`Private subnet created: ${privateSubnetId} (10.0.1.0/24, us-east-1b)`);
  console.log("Private subnet uses VPC main route table (local traffic only)");

  console.log("\n--- Subnet Setup Complete ---");
  console.log(`  Public subnet:  ${publicSubnetId} (10.0.0.0/24, us-east-1a)`);
  console.log(`    -> routes to IGW, instances get public IP`);
  console.log(`  Private subnet: ${privateSubnetId} (10.0.1.0/24, us-east-1b)`);
  console.log(`    -> no internet route, internal traffic only`);
  console.log("\nKey insight:");
  console.log("  Public subnet  = subnet with route to IGW");
  console.log("  Private subnet = subnet WITHOUT route to IGW");
  console.log("  A subnet is not public/private by itself — it's the route table that decides.");
}

createSubnets().catch(console.error);
