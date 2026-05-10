/**
 * DAY 5 - Task 1: Create an RDS PostgreSQL instance
 *
 * Concepts:
 *   - RDS = managed relational database; AWS handles patching, backups, failover
 *   - DB Subnet Group = tells RDS which subnets it can place the instance in
 *   - Security Group = controls which traffic can reach the RDS port (5432 for PostgreSQL)
 *   - db.t3.micro = smallest instance class (Free Tier eligible)
 *   - Multi-AZ = runs a standby in a second AZ for automatic failover (costs more, skipped here)
 *   - Publicly accessible = allows connections from outside the VPC (needed for local testing)
 *   - Endpoint = the DNS hostname + port you connect to (only available once instance is ready)
 */

import {
  DescribeDBInstancesCommand,
  CreateDBSubnetGroupCommand,
  CreateDBInstanceCommand,
  waitUntilDBInstanceAvailable,
} from "@aws-sdk/client-rds";
import {
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
} from "@aws-sdk/client-ec2";
import {
  rds,
  ec2,
  PREFIX,
  RDS_TAGS,
  DB_INSTANCE_ID,
  DB_SUBNET_GROUP,
  DB_SG_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  DB_NAME,
} from "./client";

async function findDefaultVpc(): Promise<{ vpcId: string; subnets: string[] }> {
  // Use the default VPC so we don't need to create one for Day 5
  // The default VPC exists in every AWS account and has a public subnet in every AZ
  const resp = await ec2.send(
    new DescribeVpcsCommand({
      Filters: [{ Name: "isDefault", Values: ["true"] }],
    })
  );
  const vpc = resp.Vpcs?.[0];
  if (!vpc?.VpcId) throw new Error("No default VPC found. Ensure your account has a default VPC.");
  console.log(`Default VPC: ${vpc.VpcId} (${vpc.CidrBlock})`);

  // Get all subnets in the default VPC — we need at least 2 in different AZs for a subnet group
  const subnetResp = await ec2.send(
    new DescribeSubnetsCommand({
      Filters: [{ Name: "vpc-id", Values: [vpc.VpcId] }],
    })
  );
  const subnets = subnetResp.Subnets ?? [];
  if (subnets.length < 2) {
    throw new Error("Need at least 2 subnets in different AZs for a DB subnet group.");
  }
  const subnetIds = subnets.map((s) => s.SubnetId!);
  console.log(`Found ${subnetIds.length} subnets: ${subnetIds.join(", ")}`);
  return { vpcId: vpc.VpcId, subnets: subnetIds };
}

async function createSecurityGroup(vpcId: string): Promise<string> {
  // Create a security group that only allows PostgreSQL traffic on port 5432
  // 0.0.0.0/0 = open to all IPs (fine for learning; restrict to your IP in production)
  const resp = await ec2.send(
    new CreateSecurityGroupCommand({
      GroupName: DB_SG_NAME,
      Description: "aws-learning day 05 - RDS PostgreSQL access",
      VpcId: vpcId,
      TagSpecifications: [
        {
          ResourceType: "security-group",
          Tags: [
            { Key: "project", Value: "aws-learning" },
            { Key: "day", Value: "05" },
            { Key: "Name", Value: DB_SG_NAME },
          ],
        },
      ],
    })
  );
  const sgId = resp.GroupId!;
  console.log(`Security group created: ${sgId}`);

  // Allow inbound PostgreSQL on port 5432
  await ec2.send(
    new AuthorizeSecurityGroupIngressCommand({
      GroupId: sgId,
      IpPermissions: [
        {
          IpProtocol: "tcp",
          FromPort: 5432,
          ToPort: 5432,
          IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "PostgreSQL access for learning" }],
        },
      ],
    })
  );
  console.log("Inbound rule added: TCP 5432 from 0.0.0.0/0");
  return sgId;
}

async function createSubnetGroup(subnets: string[]): Promise<void> {
  // DB Subnet Group = the set of subnets RDS can use to place the instance
  // Must span at least 2 AZs even for single-AZ deployments
  await rds.send(
    new CreateDBSubnetGroupCommand({
      DBSubnetGroupName: DB_SUBNET_GROUP,
      DBSubnetGroupDescription: "aws-learning day 05 - subnet group for PostgreSQL",
      SubnetIds: subnets,
      Tags: RDS_TAGS,
    })
  );
  console.log(`DB subnet group created: ${DB_SUBNET_GROUP}`);
}

async function createDbInstance(sgId: string): Promise<void> {
  // Create the RDS PostgreSQL instance
  // db.t3.micro is the smallest class; eligible for Free Tier (750 hours/month for 12 months)
  await rds.send(
    new CreateDBInstanceCommand({
      DBInstanceIdentifier: DB_INSTANCE_ID,
      DBInstanceClass: "db.t3.micro",
      Engine: "postgres",
      EngineVersion: "16.3",           // Use a recent stable version
      MasterUsername: DB_USERNAME,
      MasterUserPassword: DB_PASSWORD,
      DBName: DB_NAME,
      AllocatedStorage: 20,            // 20 GB minimum for PostgreSQL
      StorageType: "gp2",              // General Purpose SSD
      DBSubnetGroupName: DB_SUBNET_GROUP,
      VpcSecurityGroupIds: [sgId],
      PubliclyAccessible: true,        // Required to connect from local machine
      MultiAZ: false,                  // Single-AZ for learning (Multi-AZ doubles the cost)
      BackupRetentionPeriod: 0,        // Disable automated backups (saves cost for learning)
      DeletionProtection: false,       // Allow deletion without extra steps
      Tags: RDS_TAGS,
    })
  );
  console.log(`RDS instance creation initiated: ${DB_INSTANCE_ID}`);
  console.log("Waiting for instance to become available (this takes ~5-10 minutes)...");
}

async function waitAndPrintEndpoint(): Promise<void> {
  // Poll every 30 seconds until the instance status is "available"
  await waitUntilDBInstanceAvailable(
    { client: rds, maxWaitTime: 900 }, // 15-minute timeout
    { DBInstanceIdentifier: DB_INSTANCE_ID }
  );

  // Fetch the final state to get the endpoint
  const resp = await rds.send(
    new DescribeDBInstancesCommand({ DBInstanceIdentifier: DB_INSTANCE_ID })
  );
  const instance = resp.DBInstances?.[0];
  const endpoint = instance?.Endpoint;

  console.log("\n=== RDS Instance Ready ===");
  console.log(`  Instance ID: ${instance?.DBInstanceIdentifier}`);
  console.log(`  Engine:      ${instance?.Engine} ${instance?.EngineVersion}`);
  console.log(`  Class:       ${instance?.DBInstanceClass}`);
  console.log(`  Endpoint:    ${endpoint?.Address}`);
  console.log(`  Port:        ${endpoint?.Port}`);
  console.log(`  DB Name:     ${instance?.DBName}`);
  console.log(`  Username:    ${instance?.MasterUsername}`);
  console.log("\nConnection string (psql):");
  console.log(
    `  psql "host=${endpoint?.Address} port=${endpoint?.Port} dbname=${DB_NAME} user=${DB_USERNAME} password=${DB_PASSWORD} sslmode=require"`
  );
  console.log("\nNext: run 'npm run connect' to create a table and run queries");
}

async function main(): Promise<void> {
  console.log("=== Day 5 - Creating RDS PostgreSQL Instance ===\n");

  const { vpcId, subnets } = await findDefaultVpc();
  const sgId = await createSecurityGroup(vpcId);
  await createSubnetGroup(subnets);
  await createDbInstance(sgId);
  await waitAndPrintEndpoint();
}

main().catch(console.error);
