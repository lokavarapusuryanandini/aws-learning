/**
 * DAY 9 - Task 4: Dead Letter Queue (DLQ)
 *
 * Concepts:
 *   - DLQ = a separate queue where messages land after N failed processing attempts
 *   - RedrivePolicy = on the main queue: { deadLetterTargetArn, maxReceiveCount }
 *   - maxReceiveCount = how many receive attempts before moving to DLQ
 *   - After maxReceiveCount receives without deletion, SQS moves the message to DLQ
 *     on the NEXT visibility timeout expiry (not immediately)
 *   - Use case: isolate poison-pill messages; inspect + reprocess later
 *   - DLQ alarm = set a CloudWatch alarm on ApproximateNumberOfMessagesVisible on the DLQ
 *   - Redrive = SQS console feature to move messages from DLQ back to source queue for reprocessing
 *
 * Demo timeline (visibility timeout = 5s, maxReceiveCount = 3):
 *   T=0s  receive #1 → don't delete → message becomes visible again at T=5s
 *   T=6s  receive #2 → don't delete → message becomes visible again at T=11s
 *   T=12s receive #3 → don't delete → message moves to DLQ at T=17s
 *   T=18s check DLQ → message appears
 */

import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { sqs, PREFIX, DLQ_NAME, MAIN_QUEUE } from "./client";

const DEMO_QUEUE   = `${PREFIX}-dlq-demo-main`;
const DEMO_TIMEOUT = 5; // short visibility timeout for fast demo

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureQueue(name: string, extraAttrs: Record<string, string> = {}): Promise<{ url: string; arn: string }> {
  const url = await sqs
    .send(new GetQueueUrlCommand({ QueueName: name }))
    .then((r) => r.QueueUrl!)
    .catch(async () => {
      const r = await sqs.send(
        new CreateQueueCommand({ QueueName: name, Attributes: extraAttrs })
      );
      return r.QueueUrl!;
    });
  const attrs = await sqs.send(
    new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ["QueueArn"] })
  );
return {
  url,
  arn: attrs.Attributes!.QueueArn!,
};}

async function main(): Promise<void> {
  console.log("=== Day 9 - Dead Letter Queue ===\n");

  // 1. Create the DLQ (just a normal SQS queue)
  const dlq = await ensureQueue(DLQ_NAME, {
    MessageRetentionPeriod: "86400",
    VisibilityTimeout: "30",
  });
  console.log(`DLQ: ${DLQ_NAME}`);
  console.log(`  ARN: ${dlq.arn}`);

  // 2. Create main queue with RedrivePolicy pointing to DLQ
  const redrivePolicy = JSON.stringify({
    deadLetterTargetArn: dlq.arn,
    maxReceiveCount: 3, // after 3 failed receives → DLQ
  });
  const main = await ensureQueue(DEMO_QUEUE, {
    VisibilityTimeout: String(DEMO_TIMEOUT), // short for demo
    MessageRetentionPeriod: "300",
    RedrivePolicy: redrivePolicy,
  });
  console.log(`\nMain queue (maxReceiveCount=3, visibilityTimeout=${DEMO_TIMEOUT}s): ${DEMO_QUEUE}`);

  // 3. Send a "poison pill" message that will always fail processing
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: main.url,
      MessageBody: JSON.stringify({ jobId: "job-bad", task: "divide-by-zero", data: null }),
    })
  );
  console.log("\nSent a poison-pill message to the main queue");

  // 4. Simulate 3 failed processing attempts
  console.log(`\nSimulating failures (visibility timeout = ${DEMO_TIMEOUT}s)...\n`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const resp = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: main.url,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 5,
        MessageSystemAttributeNames: ["ApproximateReceiveCount"],
      })
    );

    if (!resp.Messages?.length) {
      console.log(`  Attempt ${attempt}: no message yet, waiting...`);
      await sleep(2000);
      continue;
    }

    const msg = resp.Messages[0];
    const receiveCount = msg.Attributes?.ApproximateReceiveCount ?? "?";
    console.log(`  Attempt ${attempt}: received (ApproximateReceiveCount = ${receiveCount})`);
    console.log(`    Body: ${msg.Body}`);
    console.log(`    Simulating failure — NOT deleting the message`);

    // Don't delete → message becomes visible again after VisibilityTimeout
    if (attempt < 3) {
      console.log(`    Waiting ${DEMO_TIMEOUT + 1}s for visibility timeout to expire...\n`);
      await sleep((DEMO_TIMEOUT + 1) * 1000);
    } else {
      console.log(`    This was attempt #${receiveCount} (= maxReceiveCount)`);
      console.log(`    Waiting ${DEMO_TIMEOUT + 1}s — SQS will move message to DLQ...\n`);
      await sleep((DEMO_TIMEOUT + 1) * 1000);
    }
  }

  // 5. Check the DLQ — message should have arrived
  console.log("Checking DLQ for the failed message...");
  const dlqResp = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: dlq.url,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 5,
    })
  );

  const dlqMsgs = dlqResp.Messages ?? [];
  if (dlqMsgs.length > 0) {
    console.log(`\nDLQ has ${dlqMsgs.length} message(s):`);
    for (const msg of dlqMsgs) {
      console.log(`  Body: ${msg.Body}`);
      // Acknowledge the DLQ message (we've inspected it; in prod you'd alert + reprocess)
      await sqs.send(
        new DeleteMessageCommand({ QueueUrl: dlq.url, ReceiptHandle: msg.ReceiptHandle! })
      );
      console.log("  Acknowledged (deleted from DLQ)");
    }
  } else {
    console.log("DLQ empty — the message may still be transitioning. Run again in a few seconds.");
  }

  console.log("\nNext: run 'npm run cleanup' to delete all Day 9 resources");
}

main().catch(console.error);
