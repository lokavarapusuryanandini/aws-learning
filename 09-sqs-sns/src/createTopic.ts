/**
 * DAY 9 - Task 2: SNS — create a topic, subscribe SQS, publish messages
 *
 * Concepts:
 *   - SNS = Simple Notification Service; pub/sub messaging
 *   - Topic = a named channel; publishers send to it, subscribers receive from it
 *   - Subscription = the link between a topic and an endpoint (SQS queue, email, HTTPS, Lambda...)
 *   - Protocol "sqs" = SNS pushes messages into an SQS queue
 *   - SQS access policy = required so SNS is ALLOWED to write to the queue
 *   - Message filtering = subscriber can set a filter policy; only matching messages are delivered
 *   - SNS message envelope = when SNS delivers to SQS, the SQS body contains an SNS JSON wrapper
 */

import {
  CreateTopicCommand,
  SubscribeCommand,
  PublishCommand,
  ListSubscriptionsByTopicCommand,
  GetTopicAttributesCommand,
} from "@aws-sdk/client-sns";
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
} from "@aws-sdk/client-sqs";
import { sqs, sns, PREFIX, TOPIC_NAME } from "./client";

const SUBSCRIBER_QUEUE = `${PREFIX}-sns-subscriber`;

async function ensureQueue(): Promise<{ url: string; arn: string }> {
  const url = await sqs
    .send(new GetQueueUrlCommand({ QueueName: SUBSCRIBER_QUEUE }))
    .then((r) => r.QueueUrl!)
    .catch(async () => {
      const r = await sqs.send(
        new CreateQueueCommand({
          QueueName: SUBSCRIBER_QUEUE,
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
  
  return { url, arn };
}

async function createTopic(): Promise<string> {
  const resp = await sns.send(
    new CreateTopicCommand({
      Name: TOPIC_NAME,
      Tags: [{ Key: "project", Value: "aws-learning" }, { Key: "day", Value: "09" }],
    })
  );
  console.log(`Topic created: ${resp.TopicArn}`);
  return resp.TopicArn!;
}

// SQS queues don't accept messages from SNS by default.
// You must add a resource policy (access policy) allowing sqs:SendMessage from the topic.
async function addSqsAccessPolicy(queueUrl: string, queueArn: string, topicArn: string): Promise<void> {
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: { Service: "sns.amazonaws.com" },
      Action: "sqs:SendMessage",
      Resource: queueArn,
      Condition: { ArnEquals: { "aws:SourceArn": topicArn } },
    }],
  });
  await sqs.send(
    new SetQueueAttributesCommand({ QueueUrl: queueUrl, Attributes: { Policy: policy } })
  );
  console.log("SQS access policy set (allows SNS to write)");
}

async function subscribe(topicArn: string, queueArn: string): Promise<string> {
  const resp = await sns.send(
    new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "sqs",
      Endpoint: queueArn,
      // FilterPolicy (optional) — only deliver messages matching these attributes
      // Uncomment to see filtering in action:
      // Attributes: {
      //   FilterPolicy: JSON.stringify({ messageType: ["new-order"] })
      // }
    })
  );
  console.log(`Subscription ARN: ${resp.SubscriptionArn}`);
  return resp.SubscriptionArn!;
}

async function publishMessages(topicArn: string): Promise<void> {
  console.log("\nPublishing messages to SNS topic...");

  const messages = [
    { orderId: "ord-101", item: "Laptop",     amount: 999,  type: "new-order" },
    { orderId: "ord-102", item: "Headphones", amount: 49,   type: "new-order" },
    { orderId: "ord-103", item: "Monitor",    amount: 399,  type: "refund"    },
  ];

  for (const payload of messages) {
    const resp = await sns.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(payload),
        Subject: `Order ${payload.type}: ${payload.orderId}`,
        // MessageAttributes allow subscribers to filter without parsing the body
        MessageAttributes: {
          messageType: { DataType: "String", StringValue: payload.type },
          amount:      { DataType: "Number", StringValue: String(payload.amount) },
        },
      })
    );
    console.log(`  Published: ${payload.orderId}  MessageId: ${resp.MessageId}`);
  }
}

async function receiveFromQueue(queueUrl: string): Promise<void> {
  console.log("\nReceiving SNS-delivered messages from SQS queue...");
  console.log("(SNS wraps your message in a JSON envelope — note the 'Message' field)\n");

  await new Promise((r) => setTimeout(r, 1000)); // brief wait for delivery

  const resp = await sqs.send(
    new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 5 })
  );

  for (const msg of resp.Messages ?? []) {
    // SNS delivers messages wrapped in an envelope:
    // { Type, MessageId, TopicArn, Subject, Message, Timestamp, ... }
    const envelope = JSON.parse(msg.Body ?? "{}");
    const originalPayload = JSON.parse(envelope.Message ?? "{}");

    console.log(`  From SNS:`);
    console.log(`    Subject:   ${envelope.Subject}`);
    console.log(`    TopicArn:  ${envelope.TopicArn}`);
    console.log(`    Payload:   ${JSON.stringify(originalPayload)}`);

    await sqs.send(
      new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: msg.ReceiptHandle! })
    );
  }
  console.log(`\n  Received ${resp.Messages?.length ?? 0} messages`);
}

async function main(): Promise<void> {
  console.log("=== Day 9 - SNS Topic + SQS Subscriber ===\n");

  const { url: queueUrl, arn: queueArn } = await ensureQueue();
  console.log(`Subscriber queue: ${queueUrl}`);

  const topicArn = await createTopic();
  await addSqsAccessPolicy(queueUrl, queueArn, topicArn);
  await subscribe(topicArn, queueArn);

  // Verify subscription
  const subs = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));
  console.log(`\nSubscriptions: ${subs.Subscriptions?.length ?? 0}`);
  subs.Subscriptions?.forEach((s) =>
    console.log(`  ${s.Protocol} -> ${s.Endpoint}  Status: ${s.SubscriptionArn?.startsWith("arn") ? "Confirmed" : s.SubscriptionArn}`)
  );

  await publishMessages(topicArn);
  await receiveFromQueue(queueUrl);

  console.log("\nNext: run 'npm run fanout' to see the fan-out pattern");
}

main().catch(console.error);
