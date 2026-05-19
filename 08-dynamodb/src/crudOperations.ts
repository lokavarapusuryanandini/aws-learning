/**
 * DAY 8 - Task 2: CRUD + Query + Scan + Batch + Transaction
 *
 * Uses DynamoDBDocumentClient from @aws-sdk/lib-dynamodb — no AttributeValue wrappers.
 *
 * Concepts:
 *   - PutItem    = insert or replace an item (upsert by primary key)
 *   - GetItem    = fetch ONE item by exact primary key (fastest, O(1))
 *   - UpdateItem = modify specific attributes without rewriting the whole item
 *   - DeleteItem = remove an item by primary key
 *   - Query      = read items with the SAME partition key; can filter on sort key
 *   - Scan       = read ALL items in the table; expensive; avoid in production
 *   - BatchWrite = up to 25 puts/deletes in a single network call
 *   - TransactWrite = up to 100 operations that ALL succeed or ALL fail (ACID)
 *   - ConditionExpression = only write if a condition is true (prevents lost updates)
 *   - UpdateExpression = SET, REMOVE, ADD, DELETE attribute changes
 *   - ProjectionExpression = only return the attributes you need (saves cost)
 */

import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./client";

// ── Seed data ──────────────────────────────────────────────────────────────
const orders = [
  {
    userId: "user-alice",
    orderId: "order-001",
    status: "pending",
    total: 129.99,
    createdAt: "2024-01-15T10:00:00Z",
    items: [{ sku: "LAPTOP-15", qty: 1, price: 129.99 }],
  },
  {
    userId: "user-alice",
    orderId: "order-002",
    status: "shipped",
    total: 49.99,
    createdAt: "2024-01-20T14:30:00Z",
    items: [{ sku: "HEADPHONES-X", qty: 1, price: 49.99 }],
  },
  {
    userId: "user-bob",
    orderId: "order-003",
    status: "pending",
    total: 199.98,
    createdAt: "2024-01-21T09:00:00Z",
    items: [{ sku: "KEYBOARD-M", qty: 2, price: 99.99 }],
  },
];

async function main(): Promise<void> {
  console.log("=== Day 8 - DynamoDB CRUD Operations ===\n");

  // ── 1. PutItem ─────────────────────────────────────────────────────────
  console.log("1. PutItem — insert orders");
  for (const order of orders) {
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: order }));
    console.log(`  Inserted: ${order.userId} / ${order.orderId}`);
  }

  // ── 2. GetItem ─────────────────────────────────────────────────────────
  console.log("\n2. GetItem — fetch one item by exact primary key");
  const getResp = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId: "user-alice", orderId: "order-001" },
      // ProjectionExpression = only return specific attributes
      // Saves read cost and bandwidth
      ProjectionExpression: "userId, orderId, #s, #t",
      ExpressionAttributeNames: { "#s": "status", "#t": "total" }, // "status" and "total" are reserved words
    })
  );
  console.log("  Item:", JSON.stringify(getResp.Item, null, 2));

  // ── 3. UpdateItem ──────────────────────────────────────────────────────
  console.log("\n3. UpdateItem — change order status + add a shippedAt timestamp");
  const updateResp = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId: "user-alice", orderId: "order-001" },
      // SET = assign attribute values; ADD = increment numbers/add to sets
      UpdateExpression: "SET #s = :newStatus, shippedAt = :ts",
      // ConditionExpression = only update if current status is 'pending'
      // Prevents accidentally overwriting an already-shipped order
      ConditionExpression: "#s = :expectedStatus",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":newStatus": "shipped",
        ":ts": new Date().toISOString(),
        ":expectedStatus": "pending",
      },
      ReturnValues: "ALL_NEW", // return the item after the update
    })
  );
  console.log("  Updated:", JSON.stringify(updateResp.Attributes, null, 2));

  // ── 4. Query ───────────────────────────────────────────────────────────
  console.log("\n4. Query — get all orders for user-alice (same partition key)");
  const queryResp = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      // KeyConditionExpression can use = on PK and =, <, >, between, begins_with on SK
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": "user-alice" },
    })
  );
  console.log(`  Found ${queryResp.Count} orders for user-alice:`);
  (queryResp.Items ?? []).forEach((item) =>
    console.log(`    ${item.orderId}  status=${item.status}  total=${item.total}`)
  );

  // Query with sort key condition — only orders after a date
  const queryByDate = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :uid AND orderId >= :minId",
      ExpressionAttributeValues: { ":uid": "user-alice", ":minId": "order-002" },
    })
  );
  console.log(`\n  Orders with orderId >= order-002: ${queryByDate.Count}`);

  // ── 5. BatchWriteItem ──────────────────────────────────────────────────
  console.log("\n5. BatchWriteItem — insert 3 items in one call (max 25 per batch)");
  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: [
          {
            PutRequest: {
              Item: {
                userId: "user-carol",
                orderId: "order-101",
                status: "delivered",
                total: 59.99,
                createdAt: "2024-02-01T08:00:00Z",
              },
            },
          },
          {
            PutRequest: {
              Item: {
                userId: "user-carol",
                orderId: "order-102",
                status: "pending",
                total: 29.99,
                createdAt: "2024-02-05T12:00:00Z",
              },
            },
          },
          {
            PutRequest: {
              Item: {
                userId: "user-dave",
                orderId: "order-201",
                status: "pending",
                total: 89.0,
                createdAt: "2024-02-10T16:00:00Z",
              },
            },
          },
        ],
      },
    })
  );
  console.log("  Batch write complete");

  // ── 6. TransactWrite ───────────────────────────────────────────────────
  console.log("\n6. TransactWriteItems — atomic update (all succeed or all fail)");
  // Real use-case: deduct inventory AND create order atomically
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { userId: "user-alice", orderId: "order-002" },
            UpdateExpression: "SET #s = :v",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":v": "delivered" },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              userId: "user-alice",
              orderId: "order-003",
              status: "pending",
              total: 299.0,
              createdAt: new Date().toISOString(),
            },
          },
        },
      ],
    })
  );
  console.log("  Transaction committed");

  // ── 7. Scan (anti-pattern demo) ────────────────────────────────────────
  console.log("\n7. Scan — reads ENTIRE table (avoid in production at scale)");
  const scanResp = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      // FilterExpression is applied AFTER reading all items — still expensive
      FilterExpression: "#s = :pending",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":pending": "pending" },
    })
  );
  console.log(`  Scanned items: ${scanResp.ScannedCount}, matching filter: ${scanResp.Count}`);
  (scanResp.Items ?? []).forEach((i) =>
    console.log(`    ${i.userId} / ${i.orderId}  total=${i.total}`)
  );

  // ── 8. DeleteItem ──────────────────────────────────────────────────────
  console.log("\n8. DeleteItem — remove one item");
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId: "user-dave", orderId: "order-201" },
      ReturnValues: "ALL_OLD",
    })
  );
  console.log("  Deleted: user-dave / order-201");

  console.log("\n=== CRUD complete. Next: run 'npm run gsi' ===");
}

main().catch(console.error);
