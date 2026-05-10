/**
 * DAY 5 - Cleanup: Delete all RDS resources
 *
 * Deletion order matters:
 *   1. Delete RDS instance (SkipFinalSnapshot: true — no backup needed for learning)
 *   2. Wait for instance to be fully deleted
 *   3. Delete DB subnet group
 *   4. Delete security group
 *
 * Note: Deleting an RDS instance takes several minutes even with SkipFinalSnapshot.
 */

import {
  DescribeDBInstancesCommand,
  DeleteDBInstanceCommand,
  DeleteDBSubnetGroupCommand,
  waitUntilDBInstanceDeleted,
} from "@aws-sdk/client-rds";
import {
  DescribeSecurityGroupsCommand,
  DeleteSecurityGroupCommand,
} from "@aws-sdk/client-ec2";
import { rds, ec2, DB_INSTANCE_ID, DB_SUBNET_GROUP, DB_SG_NAME } from "./client";

async function deleteDbInstance(): Promise<boolean> {
  // Check if the instance exists before trying to delete
  const resp = await rds.send(
    new DescribeDBInstancesCommand({ DBInstanceIdentifier: DB_INSTANCE_ID })
  ).catch(() => null);

  const instance = resp?.DBInstances?.[0];
  if (!instance) {
    console.log(`  RDS instance '${DB_INSTANCE_ID}' not found - skipping`);
    return false;
  }

  const status = instance.DBInstanceStatus;
  if (status === "deleting") {
    console.log(`  RDS instance already deleting - waiting...`);
    return true;
  }

  console.log(`  Deleting RDS instance: ${DB_INSTANCE_ID} (status: ${status})`);
  await rds.send(
    new DeleteDBInstanceCommand({
      DBInstanceIdentifier: DB_INSTANCE_ID,
      SkipFinalSnapshot: true,          // No backup — fine for learning
      DeleteAutomatedBackups: true,     // Remove automated backups too
    })
  );
  return true;
}

async function waitForDeletion(): Promise<void> {
  console.log("  Waiting for RDS instance to be deleted (this takes several minutes)...");
  await waitUntilDBInstanceDeleted(
    { client: rds, maxWaitTime: 900 }, // 15-minute timeout
    { DBInstanceIdentifier: DB_INSTANCE_ID }
  );
  console.log("  RDS instance deleted");
}

async function deleteSubnetGroup(): Promise<void> {
  await rds
    .send(new DeleteDBSubnetGroupCommand({ DBSubnetGroupName: DB_SUBNET_GROUP }))
    .then(() => console.log(`  DB subnet group deleted: ${DB_SUBNET_GROUP}`))
    .catch((err) => {
      if (err.name === "DBSubnetGroupNotFoundFault") {
        console.log(`  DB subnet group not found - skipping`);
      } else {
        throw err;
      }
    });
}

async function deleteSecurityGroup(): Promise<void> {
  // Find the security group by name
  const resp = await ec2.send(
    new DescribeSecurityGroupsCommand({
      Filters: [{ Name: "group-name", Values: [DB_SG_NAME] }],
    })
  );
  const sg = resp.SecurityGroups?.[0];
  if (!sg?.GroupId) {
    console.log(`  Security group '${DB_SG_NAME}' not found - skipping`);
    return;
  }

  await ec2.send(new DeleteSecurityGroupCommand({ GroupId: sg.GroupId }));
  console.log(`  Security group deleted: ${sg.GroupId} (${DB_SG_NAME})`);
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 5 - RDS resources ===\n");

  console.log("Step 1: Delete RDS instance");
  const existed = await deleteDbInstance();

  if (existed) {
    await waitForDeletion();
  }

  console.log("\nStep 2: Delete DB subnet group");
  await deleteSubnetGroup();

  console.log("\nStep 3: Delete security group");
  await deleteSecurityGroup();

  console.log("\nAll done! Your AWS account is clean.");
}

main().catch(console.error);
