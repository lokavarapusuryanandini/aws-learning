/**
 * DAY 4 — Task 1: Create a custom VPC with Internet Gateway and route tables
 *
 * Concepts:
 *   - VPC = isolated virtual network; your own private section of AWS
 *   - CIDR block = IP range for the VPC (e.g. 10.0.0.0/16 = 65,536 addresses)
 *   - Internet Gateway (IGW) = door between VPC and the public internet
 *   - Route table = rules for where traffic goes (like a router config)
 *   - Default VPC exists in every region; custom VPCs give you full control
 *   - DNS hostnames: lets EC2 instances get public DNS names (e.g. ec2-1-2-3-4.compute.amazonaws.com)
 */

import {
  CreateVpcCommand,
  ModifyVpcAttributeCommand,
  CreateInternetGatewayCommand,
  AttachInternetGatewayCommand,
  CreateRouteTableCommand,
  CreateRouteCommand,
  DescribeVpcsCommand,
} from "@aws-sdk/client-ec2";
import { ec2, PREFIX, DAY_TAGS } from "./client";

export const VPC_CIDR = "10.0.0.0/16"; // 65,536 IPs — more than enough for learning

async function createVpc(): Promise<void> {
  console.log("\n--- Creating Custom VPC ---\n");

  // Step 1: Create the VPC
  const vpcResp = await ec2.send(
    new CreateVpcCommand({
      CidrBlock: VPC_CIDR,
      TagSpecifications: [
        {
          ResourceType: "vpc",
          Tags: [...DAY_TAGS, { Key: "Name", Value: `${PREFIX}-day04-vpc` }],
        },
      ],
    })
  );
  const vpcId = vpcResp.Vpc!.VpcId!;
  console.log(`VPC created: ${vpcId} (${VPC_CIDR})`);

  // Step 2: Enable DNS hostnames (required for EC2 instances to get public DNS names)
  await ec2.send(
    new ModifyVpcAttributeCommand({
      VpcId: vpcId,
      EnableDnsHostnames: { Value: true },
    })
  );
  await ec2.send(
    new ModifyVpcAttributeCommand({
      VpcId: vpcId,
      EnableDnsSupport: { Value: true },
    })
  );
  console.log("DNS hostnames + resolution enabled");

  // Step 3: Create an Internet Gateway
  // IGW is the bridge between the VPC and the public internet
  const igwResp = await ec2.send(
    new CreateInternetGatewayCommand({
      TagSpecifications: [
        {
          ResourceType: "internet-gateway",
          Tags: [...DAY_TAGS, { Key: "Name", Value: `${PREFIX}-day04-igw` }],
        },
      ],
    })
  );
  const igwId = igwResp.InternetGateway!.InternetGatewayId!;
  console.log(`Internet Gateway created: ${igwId}`);

  // Step 4: Attach IGW to VPC
  await ec2.send(
    new AttachInternetGatewayCommand({
      InternetGatewayId: igwId,
      VpcId: vpcId,
    })
  );
  console.log("Internet Gateway attached to VPC");

  // Step 5: Create a public route table
  // This route table will be associated with public subnets
  const rtResp = await ec2.send(
    new CreateRouteTableCommand({
      VpcId: vpcId,
      TagSpecifications: [
        {
          ResourceType: "route-table",
          Tags: [...DAY_TAGS, { Key: "Name", Value: `${PREFIX}-day04-public-rt` }],
        },
      ],
    })
  );
  const routeTableId = rtResp.RouteTable!.RouteTableId!;
  console.log(`Public route table created: ${routeTableId}`);

  // Step 6: Add a default route — all internet traffic (0.0.0.0/0) goes via the IGW
  // This is what makes a subnet "public" — it has a route to the internet
  await ec2.send(
    new CreateRouteCommand({
      RouteTableId: routeTableId,
      DestinationCidrBlock: "0.0.0.0/0",
      GatewayId: igwId,
    })
  );
  console.log("Default route added: 0.0.0.0/0 -> IGW");

  // Summary
  console.log("\n--- VPC Backbone Ready ---");
  console.log(`  VPC ID:           ${vpcId}`);
  console.log(`  CIDR:             ${VPC_CIDR}`);
  console.log(`  Internet Gateway: ${igwId}`);
  console.log(`  Public Route Table: ${routeTableId}`);
  console.log("\nNext: run 'npm run subnets' to create public + private subnets");
}

createVpc().catch(console.error);
