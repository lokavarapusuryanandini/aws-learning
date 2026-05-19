/**
 * DAY 9 - Task 3: Fan-out pattern — one SNS publish, multiple SQS consumers
 *
 * Concepts:
 *   - Fan-out = one event delivered to N consumers in parallel (not sequentially)
 *   - Use case: "order placed" → notify warehouse + send email + log analytics
 *   - With SQS alone, only ONE consumer gets each message
 *   - With SNS → multiple SQS: ALL queues receive the same message simultaneously
 *   - Each subscriber processes independently; one failure doesn't affect others
 *   - Message filtering: subscribers can add a FilterPolicy to only receive certain messages
 *   - This decouples producers from consumers — add/remove consumers without changing the publisher
 */

import {
  CreateTopicCommand,
  SubscribeCommand,
  PublishCommand,
} from "@aws-sdk/client-sns";
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
} from "@aws-sdk/client-sqs";
import { sqs, sns, FANOUT_TOPIC, FANOUT_QUEUES } from "./client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface QueueInfo { name: string; url: string; arn: string }

async function ensureQueue(queueName: string): Promise<QueueInfo> {
  const url = await sqs
    .send(new GetQueueUrlCommand({ QueueName: queueName }))
    .then((r) => r.QueueUrl!)
    .catch(async () => {
      const r = await sqs.send(
        new CreateQueueCommand({
          QueueName: queueName,
          Attributes: { VisibilityTimeout: "30", MessageRetentionPeriod: "86400" },
        })
      );
      return r.QueueUrl!;
    });
  const attrs = await sqs.send(
    new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ["QueueArn"] })
  );
  const arn = attrs.Attributes?.QueueArn;
  
  if (!arn) {
    throw new Error("QueueArn not found");
  }

  return { name: queueName, url,arn};
}

async function setupFanout(): Promise<{ topicArn: string; queues: QueueInfo[] }> {
  console.log("Creating SNS topic and SQS subscriber queues...\n");

  // Create the fan-out topic
  const topicResp = await sns.send(
    new CreateTopicCommand({ Name: FANOUT_TOPIC })
  );
  const topicArn = topicResp.TopicArn!;
  console.log(`Topic: ${FANOUT_TOPIC}`);
  console.log(`  ARN: ${topicArn}\n`);

  // Create and subscribe all queues
  const queues: QueueInfo[] = [];
  for (const [label, name] of Object.entries(FANOUT_QUEUES)) {
    const q = await ensureQueue(name);
    queues.push(q);

    // Allow SNS to write to this queue
    const policy = JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: { Service: "sns.amazonaws.com" },
        Action: "sqs:SendMessage",
        Resource: q.arn,
        Condition: { ArnEquals: { "aws:SourceArn": topicArn } },
      }],
    });
    await sqs.send(
      new SetQueueAttributesCommand({ QueueUrl: q.url, Attributes: { Policy: policy } })
    );

    // Subscribe queue to the SNS topic
    // Each subscriber can add a FilterPolicy to only receive certain messages
    await sns.send(
      new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: "sqs",
        Endpoint: q.arn,
        // Example filter: analytics queue only receives high-value orders
        ...(label === "analytics"
          ? {
              Attributes: {
                FilterPolicy: JSON.stringify({ orderValue: [{ numeric: [">=", 100] }] }),
              },
            }
          : {}),
      })
    );
    console.log(`  Subscribed: ${label} (${name})`);
  }
  return { topicArn, queues };
}

async function publishOrderEvent(topicArn: string): Promise<void> {
  console.log("\nPublishing 'order placed' events...\n");

  const orders = [
    { orderId: "ord-201", item: "Laptop",     amount: 999,  orderValue: 999  },
    { orderId: "ord-202", item: "USB Cable",  amount: 9,    orderValue: 9    },
  ];

  for (const order of orders) {
    await sns.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(order),
        Subject: `New order: ${order.orderId}`,
        MessageAttributes: {
          eventType:  { DataType: "String", StringValue: "order.placed" },
          orderValue: { DataType: "Number", StringValue: String(order.orderValue) },
        },
      })
    );
    console.log(`  Published: ${order.orderId} (value: $${order.amount})`);
  }
}

async function receiveFromAll(queues: QueueInfo[]): Promise<void> {
  console.log("\nPolling all subscriber queues (fan-out delivery)...\n");
  await sleep(1500); // short wait for SNS → SQS delivery

  for (const q of queues) {
    const resp = await sqs.send(
      new ReceiveMessageCommand({ QueueUrl: q.url, MaxNumberOfMessages: 10, WaitTimeSeconds: 3 })
    );
    const msgs = resp.Messages ?? [];
    console.log(`  ${q.name}: received ${msgs.length} message(s)`);
    for (const msg of msgs) {
      const envelope = JSON.parse(msg.Body ?? "{}");
      const payload = JSON.parse(envelope.Message ?? "{}");
      console.log(`    -> ${payload.orderId} $${payload.amount}`);
      await sqs.send(
        new DeleteMessageCommand({ QueueUrl: q.url, ReceiptHandle: msg.ReceiptHandle! })
      );
    }
  }

  console.log("\nFan-out result:");
  console.log("  order-processor:    gets ALL orders (no filter)");
  console.log("  email-notifier:     gets ALL orders (no filter)");
  console.log("  analytics:          gets ONLY orders with orderValue >= 100 (filter policy)");
}

async function main(): Promise<void> {
  console.log("=== Day 9 - SNS Fan-out Pattern ===\n");
  const { topicArn, queues } = await setupFanout();
  await publishOrderEvent(topicArn);
  await receiveFromAll(queues);
  console.log("\nNext: run 'npm run dlq' to see dead letter queues");
}

main().catch(console.error);
