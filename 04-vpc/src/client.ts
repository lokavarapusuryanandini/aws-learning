import { EC2Client } from "@aws-sdk/client-ec2";

// VPC is an EC2-family service — uses the same client
export const ec2 = new EC2Client({ region: "us-east-1" });

export const PREFIX = "aws-learning";

export const DAY_TAGS = [
  { Key: "project", Value: "aws-learning" },
  { Key: "day", Value: "04" },
];
