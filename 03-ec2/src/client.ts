import { EC2Client } from "@aws-sdk/client-ec2";

export const ec2 = new EC2Client({ region: "us-east-1" });

export const PREFIX = "aws-learning";

// Used to tag every resource so cleanup can find them by tag
export const DAY_TAGS = [
  { Key: "project", Value: "aws-learning" },
  { Key: "day", Value: "03" },
];
