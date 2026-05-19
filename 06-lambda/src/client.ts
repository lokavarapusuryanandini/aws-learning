import { LambdaClient } from "@aws-sdk/client-lambda";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { IAMClient } from "@aws-sdk/client-iam";

export const lambda = new LambdaClient({ region: "us-east-1" });
export const cwLogs = new CloudWatchLogsClient({ region: "us-east-1" });
export const iam = new IAMClient({ region: "us-east-1" });

export const FUNCTION_NAME = "aws-learning-day06";
export const ROLE_NAME = "aws-learning-day06-lambda-role";
export const LOG_GROUP = `/aws/lambda/${FUNCTION_NAME}`;

// ARN of the AWS-managed policy that allows Lambda to write logs to CloudWatch
export const BASIC_EXECUTION_POLICY =
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole";
