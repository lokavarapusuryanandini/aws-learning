/**
 * DAY 8 - Task 4: DynamoDB Streams
 *
 * Concepts:
 *   - DynamoDB Streams = an ordered, time-limited log of all item changes
 *   - Each change = INSERT, MODIFY, or REMOVE event with old + new image
 *   - Stream records are available for 24 hours
 *   - StreamViewType:
 *       KEYS_ONLY          = only the PK of changed items
 *       NEW_IMAGE          = the item AFTER the change
 *       OLD_IMAGE          = the item BEFORE the change
 *       NEW_AND_OLD_IMAGES = both (most useful for auditing)
 *   - Shards = partitioned stream segments; one shard iterator per shard
 *   - Common pattern: Lambda trigger on the stream → react to changes
 *     (Day 6 Lambda + Day 8 Streams = event-driven architecture)
 *   - Stream ARN changes if you disable+re-enable streams
 */

import {
  UpdateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DescribeStreamCommand,
  GetShardIteratorCommand,
  GetRecordsCommand,
} from "@aws-sdk/client-dynamodb-streams";
import { DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, docClient, TABLE_NAME } from "./client";

const streamsClient = new DynamoDBStreamsClient({ region: "us-east-1" });

async function enableStreams(): Promise<string> {
  const desc = await ddb.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
  const spec = desc.Table?.StreamSpecification;

  if (spec?.StreamEnabled) {
    const arn = desc.Table?.LatestStreamArn!;
    console.log(`Streams already enabled: ${arn}`);
    return arn;
  }

  console.log("Enabling DynamoDB Streams (NEW_AND_OLD_IMAGES)...");
  await ddb.send(
    new UpdateTableCommand({
      TableName: TABLE_NAME,
      StreamSpecification: {
        StreamEnabled: true,
        StreamViewType: "NEW_AND_OLD_IMAGES",
      },
    })
  );

  // Wait for the table to return to ACTIVE after the update
  for (let i = 0; i < 20; i++) {
    const d = await ddb.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    if (d.Table?.TableStatus === "ACTIVE") {
      const arn = d.Table.LatestStreamArn!;
      console.log(`Streams enabled. Stream ARN: ${arn}`);
      return arn;
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  throw new Error("Timed out waiting for stream to be enabled");
}

async function generateStreamRecords(): Promise<void> {
  console.log("\nGenerating stream records (INSERT + MODIFY + DELETE)...");
  const key = { userId: "user-stream-test", orderId: "order-stream-001" };

  // INSERT
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...key, status: "pending", total: 77.77, createdAt: new Date().toISOString() },
    })
  );
  console.log("  INSERT: user-stream-test / order-stream-001");

  // MODIFY
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...key, status: "shipped", total: 77.77, createdAt: new Date().toISOString() },
    })
  );
  console.log("  MODIFY: status -> shipped");

  // DELETE
  await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: key }));
  console.log("  DELETE: item removed");

  // Short pause to ensure records are available on the stream
  await new Promise((r) => setTimeout(r, 2_000));
}

async function readStreamRecords(streamArn: string): Promise<void> {
  console.log("\n=== Reading Stream Records ===\n");

  // DescribeStream → get shard IDs
  const streamDesc = await streamsClient.send(
    new DescribeStreamCommand({ StreamArn: streamArn })
  );
  const shards = streamDesc.StreamDescription?.Shards ?? [];
  console.log(`Stream has ${shards.length} shard(s)`);

  for (const shard of shards) {
    const shardId = shard.ShardId!;
    console.log(`\nShard: ${shardId}`);

    // GetShardIterator — TRIM_HORIZON = start from the oldest record in the shard
    const iterResp = await streamsClient.send(
      new GetShardIteratorCommand({
        StreamArn: streamArn,
        ShardId: shardId,
        ShardIteratorType: "TRIM_HORIZON", // read from the beginning
        // LATEST = only new records going forward (useful for real-time processing)
      })
    );
    const iterator = iterResp.ShardIterator;
    if (!iterator) continue;

    // GetRecords — read up to 1000 records from this position
    const recordsResp = await streamsClient.send(
      new GetRecordsCommand({ ShardIterator: iterator, Limit: 100 })
    );
    const records = recordsResp.Records ?? [];
    console.log(`  ${records.length} record(s):`);

    for (const rec of records) {
      const dyn = rec.dynamodb!;
      console.log(`\n  eventName: ${rec.eventName}`);
      // Keys are always present regardless of StreamViewType
      console.log(`  Keys:      ${JSON.stringify(dyn.Keys)}`);
      if (dyn.OldImage) {
        console.log(`  OldImage:  ${JSON.stringify(dyn.OldImage)}`);
      }
      if (dyn.NewImage) {
        console.log(`  NewImage:  ${JSON.stringify(dyn.NewImage)}`);
      }
      console.log(`  Sequence:  ${dyn.SequenceNumber}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("=== Day 8 - DynamoDB Streams ===\n");
  const streamArn = await enableStreams();
  await generateStreamRecords();
  await readStreamRecords(streamArn);

  console.log("\n=== Streams demo complete ===");
  console.log(
    "\nIn production, you would attach a Lambda trigger to the stream:\n" +
      "  AWS Console -> DynamoDB -> Table -> Exports and streams -> Trigger -> Create trigger\n" +
      "Lambda processes stream records in order, per shard, automatically."
  );
  console.log("\nNext: run 'npm run cleanup' to delete the table");
}

main().catch(console.error);
