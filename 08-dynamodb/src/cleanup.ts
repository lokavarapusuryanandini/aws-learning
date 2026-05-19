/**
 * DAY 8 - Cleanup: Delete the DynamoDB table
 *
 * DeleteTable removes the table, all its data, all GSIs, and the stream.
 * waitUntilTableNotExists polls DescribeTable until it returns ResourceNotFoundException.
 */

import {
  DescribeTableCommand,
  DeleteTableCommand,
  waitUntilTableNotExists,
} from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "./client";

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 8 - DynamoDB resources ===\n");

  const existing = await ddb
    .send(new DescribeTableCommand({ TableName: TABLE_NAME }))
    .catch(() => null);

  if (!existing?.Table) {
    console.log(`Table '${TABLE_NAME}' not found - nothing to delete`);
    return;
  }

  console.log(`Deleting table: ${TABLE_NAME}`);
  await ddb.send(new DeleteTableCommand({ TableName: TABLE_NAME }));

  console.log("Waiting for table deletion...");
  await waitUntilTableNotExists(
    { client: ddb, maxWaitTime: 120 },
    { TableName: TABLE_NAME }
  );

  console.log(`Table deleted: ${TABLE_NAME}`);
  console.log("\nAll done! Your AWS account is clean.");
}

main().catch(console.error);
