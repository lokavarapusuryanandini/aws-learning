import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

export const cw = new CloudWatchClient({ region: "us-east-1" });
export const cwLogs = new CloudWatchLogsClient({ region: "us-east-1" });

export const NAMESPACE      = "aws-learning/Day10";
export const LOG_GROUP      = "/aws-learning/day10";
export const LOG_STREAM     = "app-logs";
export const ALARM_NAME     = "aws-learning-day10-high-latency";
export const DASHBOARD_NAME = "aws-learning-day10";
