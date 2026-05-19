/**
 * DAY 8 - Task 1: Create a DynamoDB table
 *
 * Concepts:
 *   - Primary key = uniquely identifies every item; required on every write/read
 *   - Partition key (HASH) = determines the physical partition; good cardinality matters
 *   - Sort key (RANGE) = secondary key within a partition; enables range queries
 *   - AttributeDefinitions = only keys need to be declared upfront; all other attributes are schema-less
 *   - PAY_PER_REQUEST = on-demand billing; scales automatically; no capacity planning
 *   - PROVISIONED = you specify RCU/WCU; cheaper at predictable load; auto-scaling possible
 *   - waitUntilTableExists = polls DescribeTable until status is ACTIVE
 */

import {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "./client";

async function main(): Promise<void> {
  console.log("=== Day 8 - Create DynamoDB Table ===\n");

  // Check if table already exists
  const existing = await ddb
    .send(new DescribeTableCommand({ TableName: TABLE_NAME }))
    .catch(() => null);
  if (existing?.Table?.TableStatus === "ACTIVE") {
    console.log(`Table '${TABLE_NAME}' already exists and is ACTIVE`);
    return;
  }

  console.log(`Creating table: ${TABLE_NAME}`);

  await ddb.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,

      // DynamoDB is schema-less — you only declare key attributes here.
      // Non-key attributes (status, total, items...) don't need declaring.
      AttributeDefinitions: [
        { AttributeName: "userId", AttributeType: "S" }, // S = String
        { AttributeName: "orderId", AttributeType: "S" }, // N = Number, B = Binary
      ],

      // Primary key = Partition key + (optional) Sort key
      // Hash + Range → composite primary key
      KeySchema: [
        { AttributeName: "userId", KeyType: "HASH" },  // partition key
        { AttributeName: "orderId", KeyType: "RANGE" }, // sort key
      ],

      // PAY_PER_REQUEST = no capacity planning; great for unpredictable / low traffic
      BillingMode: "PAY_PER_REQUEST",

      Tags: [
        { Key: "project", Value: "aws-learning" },
        { Key: "day", Value: "08" },
      ],
    })
  );

  console.log("Waiting for table to become ACTIVE...");
  await waitUntilTableExists(
    { client: ddb, maxWaitTime: 60 },
    { TableName: TABLE_NAME }
  );

  // Describe the created table
  const desc = await ddb.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
  const t = desc.Table!;

  console.log("\n=== Table Created ===");
  console.log(`  Name:          ${t.TableName}`);
  console.log(`  ARN:           ${t.TableArn}`);
  console.log(`  Status:        ${t.TableStatus}`);
  console.log(`  Billing mode:  PAY_PER_REQUEST`);
  console.log(`  Partition key: userId (String)`);
  console.log(`  Sort key:      orderId (String)`);
  console.log("\nNext: run 'npm run crud' to perform read/write operations");
}

main().catch(console.error);
