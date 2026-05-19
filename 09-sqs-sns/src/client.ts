import { SQSClient } from "@aws-sdk/client-sqs";
import { SNSClient } from "@aws-sdk/client-sns";

export const sqs = new SQSClient({ region: "us-east-1" });
export const sns = new SNSClient({ region: "us-east-1" });

export const PREFIX = "aws-learning-day09";

// Queue names
export const MAIN_QUEUE   = `${PREFIX}-main`;
export const DLQ_NAME     = `${PREFIX}-dlq`;
export const FANOUT_TOPIC = `${PREFIX}-orders`;
export const FANOUT_QUEUES = {
  processor:    `${PREFIX}-order-processor`,
  notification: `${PREFIX}-email-notifier`,
  analytics:    `${PREFIX}-analytics`,
};

// SNS topic for Day 9
export const TOPIC_NAME = `${PREFIX}-topic`;
