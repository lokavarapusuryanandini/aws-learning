/**
 * DAY 9 - Cleanup: Delete all SQS queues and SNS topics
 * Queues: list by prefix and delete
 * Topics: list all, filter by name, delete
 * Subscriptions are auto-removed when the queue or topic is deleted.
 */

import {
  ListQueuesCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import {
  ListTopicsCommand,
  DeleteTopicCommand,
} from "@aws-sdk/client-sns";
import { sqs, sns, PREFIX } from "./client";

async function deleteQueues(): Promise<void> {
  console.log("Deleting SQS queues...");
  const resp = await sqs.send(new ListQueuesCommand({ QueueNamePrefix: PREFIX }));
  const urls = resp.QueueUrls ?? [];
  if (urls.length === 0) {
    console.log("  No queues found");
    return;
  }
  for (const url of urls) {
    await sqs.send(new DeleteQueueCommand({ QueueUrl: url }));
    const name = url.split("/").pop();
    console.log(`  Deleted: ${name}`);
  }
}

async function deleteTopics(): Promise<void> {
  console.log("\nDeleting SNS topics...");
  const resp = await sns.send(new ListTopicsCommand({}));
  const matching = (resp.Topics ?? []).filter((t) =>
    t.TopicArn?.includes(PREFIX)
  );
  if (matching.length === 0) {
    console.log("  No topics found");
    return;
  }
  for (const topic of matching) {
    await sns.send(new DeleteTopicCommand({ TopicArn: topic.TopicArn! }));
    const name = topic.TopicArn!.split(":").pop();
    console.log(`  Deleted: ${name}`);
  }
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 9 - SQS + SNS resources ===\n");
  // SQS has a 60-second delay before a deleted queue name can be reused
  await deleteQueues();
  await deleteTopics();
  console.log("\nAll done! (Note: deleted queue names cannot be reused for 60 seconds)");
}

main().catch(console.error);
