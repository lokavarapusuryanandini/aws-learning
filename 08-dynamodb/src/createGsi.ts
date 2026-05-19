/**
 * DAY 8 - Task 3: Add a Global Secondary Index (GSI)
 *
 * Concepts:
 *   - GSI = a secondary index with a DIFFERENT partition key than the base table
 *   - Allows efficient queries on non-primary-key attributes (e.g. query by "status")
 *   - GSI has its own partition key + optional sort key
 *   - GSI is eventually consistent by default (milliseconds behind the table)
 *   - ProjectionType = which attributes are copied into the index:
 *       KEYS_ONLY = only PK + GSI keys
 *       INCLUDE   = KEYS_ONLY + specified attributes
 *       ALL       = every attribute (most storage, most flexible)
 *   - Table enters UPDATING status during GSI creation (backfill takes time)
 *   - LSI (Local Secondary Index) = same partition key, different sort key; must be defined at table creation
 */

import {
  UpdateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, docClient, TABLE_NAME, GSI_NAME } from "./client";

async function addGsi(): Promise<void> {
  // Check if GSI already exists
  const desc = await ddb.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
  const existingGsi = (desc.Table?.GlobalSecondaryIndexes ?? []).find(
    (g) => g.IndexName === GSI_NAME
  );
  if (existingGsi) {
    console.log(`GSI '${GSI_NAME}' already exists (status: ${existingGsi.IndexStatus})`);
    return;
  }

  console.log(`Adding GSI: ${GSI_NAME}`);
  console.log("  Hash key:  status (query all orders with a given status)");
  console.log("  Range key: createdAt (sort results by date)\n");

  // UpdateTable adds the GSI — the table stays online during backfill
  await ddb.send(
    new UpdateTableCommand({
      TableName: TABLE_NAME,
      // Must declare the NEW attribute types here
      AttributeDefinitions: [
        { AttributeName: "userId", AttributeType: "S" },   // must re-declare existing keys
        { AttributeName: "orderId", AttributeType: "S" },
        { AttributeName: "status", AttributeType: "S" },   // new GSI hash key
        { AttributeName: "createdAt", AttributeType: "S" }, // new GSI range key
      ],
      GlobalSecondaryIndexUpdates: [
        {
          Create: {
            IndexName: GSI_NAME,
            KeySchema: [
              { AttributeName: "status", KeyType: "HASH" },
              { AttributeName: "createdAt", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "ALL", // copy all attributes into the GSI
            },
          },
        },
      ],
    })
  );
  console.log("GSI creation initiated. Waiting for ACTIVE status...");
}

async function waitForGsiActive(): Promise<void> {
  // Table goes to UPDATING during backfill; poll until GSI becomes ACTIVE
  for (let i = 0; i < 60; i++) {
    const desc = await ddb.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    const gsi = (desc.Table?.GlobalSecondaryIndexes ?? []).find(
      (g) => g.IndexName === GSI_NAME
    );
    const tableStatus = desc.Table?.TableStatus;
    const gsiStatus = gsi?.IndexStatus ?? "not found";
    process.stdout.write(`  Table: ${tableStatus}, GSI: ${gsiStatus}\r`);

    if (gsi?.IndexStatus === "ACTIVE") {
      console.log(`\nGSI is ACTIVE`);
      return;
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  throw new Error("Timed out waiting for GSI to become ACTIVE");
}

async function queryGsi(): Promise<void> {
  console.log("\n=== Query via GSI ===");
  console.log("Use case: find all PENDING orders sorted by date (not possible with base table)\n");

  // Query using the GSI — specify IndexName to use the index instead of the base table
  const resp = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: "#s = :status",
      // FilterExpression = applied after GSI read; not part of key condition
      // Here we just query on the GSI key — no extra filter needed
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":status": "pending" },
      // ScanIndexForward: false = descending order by sort key (newest first)
      ScanIndexForward: false,
    })
  );

  console.log(`Pending orders (newest first): ${resp.Count}`);
  (resp.Items ?? []).forEach((item) =>
    console.log(
      `  ${item.createdAt}  ${item.userId} / ${item.orderId}  total=$${item.total}`
    )
  );

  // Demonstrate range condition on GSI sort key
  const rangeResp = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: "#s = :status AND createdAt >= :from",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":status": "pending",
        ":from": "2024-01-20T00:00:00Z",
      },
    })
  );
  console.log(`\nPending orders on/after 2024-01-20: ${rangeResp.Count}`);
  (rangeResp.Items ?? []).forEach((item) =>
    console.log(`  ${item.createdAt}  ${item.userId} / ${item.orderId}`)
  );
}

async function main(): Promise<void> {
  console.log("=== Day 8 - Global Secondary Index ===\n");
  await addGsi();
  await waitForGsiActive();
  await queryGsi();
  console.log("\nNext: run 'npm run streams'");
}

main().catch(console.error);
