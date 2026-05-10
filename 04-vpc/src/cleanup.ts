/**
 * DAY 4 — Cleanup: Delete all VPC resources
 *
 * Deletion order matters — dependencies must be removed first:
 *   1. Subnets
 *   2. Disassociate + delete route tables (can't delete the main/default one)
 *   3. Detach + delete Internet Gateway
 *   4. Delete VPC (must be empty: no subnets, IGW, etc.)
 */

import {
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DeleteSubnetCommand,
  DescribeRouteTablesCommand,
  DisassociateRouteTableCommand,
  DeleteRouteTableCommand,
  DescribeInternetGatewaysCommand,
  DetachInternetGatewayCommand,
  DeleteInternetGatewayCommand,
  DeleteVpcCommand,
} from "@aws-sdk/client-ec2";
import { ec2 } from "./client";

async function findVpcId(): Promise<string | null> {
  const resp = await ec2.send(
    new DescribeVpcsCommand({
      Filters: [
        { Name: "tag:project", Values: ["aws-learning"] },
        { Name: "tag:day", Values: ["04"] },
      ],
    })
  );
  return resp.Vpcs?.[0]?.VpcId ?? null;
}

async function deleteSubnets(vpcId: string): Promise<void> {
  const resp = await ec2.send(
    new DescribeSubnetsCommand({
      Filters: [{ Name: "vpc-id", Values: [vpcId] }],
    })
  );
  if (!resp.Subnets?.length) {
    console.log("  No subnets found");
    return;
  }
  for (const subnet of resp.Subnets) {
    await ec2.send(new DeleteSubnetCommand({ SubnetId: subnet.SubnetId }));
    const name = subnet.Tags?.find((t) => t.Key === "Name")?.Value ?? subnet.SubnetId;
    console.log(`  Deleted subnet: ${name}`);
  }
}

async function deleteRouteTables(vpcId: string): Promise<void> {
  const resp = await ec2.send(
    new DescribeRouteTablesCommand({
      Filters: [{ Name: "vpc-id", Values: [vpcId] }],
    })
  );
  for (const rt of resp.RouteTables ?? []) {
    // Skip the main route table — it's deleted automatically when the VPC is deleted
    const isMain = rt.Associations?.some((a) => a.Main);
    if (isMain) continue;

    // Disassociate all non-main associations first
    for (const assoc of rt.Associations ?? []) {
      if (!assoc.Main && assoc.RouteTableAssociationId) {
        await ec2.send(
          new DisassociateRouteTableCommand({
            AssociationId: assoc.RouteTableAssociationId,
          })
        );
      }
    }
    await ec2.send(new DeleteRouteTableCommand({ RouteTableId: rt.RouteTableId }));
    console.log(`  Deleted route table: ${rt.RouteTableId}`);
  }
}

async function deleteInternetGateway(vpcId: string): Promise<void> {
  const resp = await ec2.send(
    new DescribeInternetGatewaysCommand({
      Filters: [{ Name: "attachment.vpc-id", Values: [vpcId] }],
    })
  );
  for (const igw of resp.InternetGateways ?? []) {
    await ec2.send(
      new DetachInternetGatewayCommand({
        InternetGatewayId: igw.InternetGatewayId,
        VpcId: vpcId,
      })
    );
    await ec2.send(
      new DeleteInternetGatewayCommand({
        InternetGatewayId: igw.InternetGatewayId,
      })
    );
    console.log(`  Deleted Internet Gateway: ${igw.InternetGatewayId}`);
  }
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 4 - VPC resources ===\n");

  const vpcId = await findVpcId();
  if (!vpcId) {
    console.log("No Day 4 VPC found - nothing to clean up.");
    return;
  }
  console.log(`Found VPC: ${vpcId}\n`);

  console.log("Step 1: Delete subnets");
  await deleteSubnets(vpcId);

  console.log("\nStep 2: Delete custom route tables");
  await deleteRouteTables(vpcId);

  console.log("\nStep 3: Detach and delete Internet Gateway");
  await deleteInternetGateway(vpcId);

  console.log("\nStep 4: Delete VPC");
  await ec2.send(new DeleteVpcCommand({ VpcId: vpcId }));
  console.log(`  VPC deleted: ${vpcId}`);

  console.log("\nAll done! Your AWS account is clean.");
}

main().catch(console.error);
