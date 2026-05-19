/**
 * DAY 9 - Task 1: SQS — create a queue, send and receive messages
 *
 * Concepts:
 *   - SQS = Simple Queue Service; fully managed, durable, at-least-once delivery
 *   - Standard queue = high throughput, at-least-once, best-effort ordering
 *   - FIFO queue = exactly-once, strict ordering; suffix must be ".fifo"
 *   - VisibilityTimeout = how long a received message is hidden from other consumers
 *   - Long polling (WaitTimeSeconds > 0) = waits up to 20s for messages; reduces empty polls
 *   - Short polling (WaitTimeSeconds = 0) = returns immediately even if queue is empty
 *   - ReceiptHandle = token needed to delete the message after processing
 *   - At-least-once = same message may be delivered more than once; make consumers idempotent
 *   - MessageAttributes = metadata on the message; useful for filtering without reading the body
 */

import {
  CreateQueueCommand,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ChangeMessageVisibilityCommand,
} from "@aws-sdk/client-sqs";
import { sqs, MAIN_QUEUE } from "./client";

async function createQueue(): Promise<string> {
  const resp = await sqs.send(
    new CreateQueueCommand({
      QueueName: MAIN_QUEUE,
      Attributes: {
        VisibilityTimeout: "30",          // seconds; message stays hidden this long after receive
        MessageRetentionPeriod: "86400",  // 1 day; max is 14 days
        ReceiveMessageWaitTimeSeconds: "5", // long polling — wait up to 5s for messages
      },
      tags: { project: "aws-learning", day: "09" },
    })
  );
  const url = resp.QueueUrl!;
  console.log(`Queue created: ${url}`);
  return url;
}

async function sendMessages(queueUrl: string): Promise<void> {
  console.log("\nSending messages...");

  // Single message
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ orderId: "ord-001", item: "Laptop", amount: 999 }),
      // MessageAttributes = metadata; doesn't require reading/parsing the body
      MessageAttributes: {
        messageType: { DataType: "String", StringValue: "new-order" },
        priority:    { DataType: "String", StringValue: "high" },
      },
      // DelaySeconds = delay before message becomes visible (0-900)
      DelaySeconds: 0,
    })
  );
  console.log("  Sent: ord-001");

  // Batch send (up to 10 messages, one API call)
  await sqs.send(
    new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: [
        { Id: "1", MessageBody: JSON.stringify({ orderId: "ord-002", item: "Headphones", amount: 49 }) },
        { Id: "2", MessageBody: JSON.stringify({ orderId: "ord-003", item: "Keyboard",   amount: 79 }) },
        { Id: "3", MessageBody: JSON.stringify({ orderId: "ord-004", item: "Mouse",      amount: 29 }) },
      ],
    })
  );
  console.log("  Batch sent: ord-002, ord-003, ord-004");
}

async function receiveAndProcess(queueUrl: string): Promise<void> {
  console.log("\nReceiving and processing messages (long poll, WaitTimeSeconds=5)...");

  let received = 0;
  // Poll until empty
  while (true) {
    const resp = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,   // max per call is 10
        WaitTimeSeconds: 5,        // long poll — waits up to 5s before returning empty
        MessageAttributeNames: ["All"], // include all custom attributes
        MessageSystemAttributeNames: ["ApproximateReceiveCount", "SentTimestamp"],
      })
    );

    const messages = resp.Messages ?? [];
    if (messages.length === 0) break; // queue is empty

    for (const msg of messages) {
      const body = JSON.parse(msg.Body ?? "{}");
      const receiveCount = msg.Attributes?.ApproximateReceiveCount;
      console.log(
        `  Processing: ${body.orderId}  amount=$${body.amount}  receiveCount=${receiveCount}`
      );

      // ChangeMessageVisibility: extend the timeout if processing is taking long
      // (useful to prevent re-delivery before you finish processing)
      await sqs.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: msg.ReceiptHandle!,
          VisibilityTimeout: 30, // give ourselves 30s to finish
        })
      );

      // Delete = acknowledge successful processing
      // Without this, the message becomes visible again after VisibilityTimeout
      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: msg.ReceiptHandle!,
        })
      );
      received++;
    }
  }
  console.log(`\n  Processed ${received} messages`);
}

async function showQueueStats(queueUrl: string): Promise<void> {
  const attrs = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: [
        "ApproximateNumberOfMessages",         // visible (ready to be received)
        "ApproximateNumberOfMessagesNotVisible", // in-flight (received but not deleted)
        "ApproximateNumberOfMessagesDelayed",    // delayed (not yet visible)
        "QueueArn",
      ],
    })
  );
  console.log("\nQueue stats:");
  console.log(`  ARN:        ${attrs.Attributes?.QueueArn}`);
  console.log(`  Visible:    ${attrs.Attributes?.ApproximateNumberOfMessages}`);
  console.log(`  In-flight:  ${attrs.Attributes?.ApproximateNumberOfMessagesNotVisible}`);
  console.log(`  Delayed:    ${attrs.Attributes?.ApproximateNumberOfMessagesDelayed}`);
}

async function main(): Promise<void> {
  console.log("=== Day 9 - SQS Queue Demo ===\n");

  // Try to get existing queue URL, create if not found
  const queueUrl = await sqs
    .send(new GetQueueUrlCommand({ QueueName: MAIN_QUEUE }))
    .then((r) => r.QueueUrl!)
    .catch(() => createQueue());

  await sendMessages(queueUrl);
  await receiveAndProcess(queueUrl);
  await showQueueStats(queueUrl);

  console.log("\nNext: run 'npm run topic' to see SQS + SNS integration");
}

main().catch(console.error);
