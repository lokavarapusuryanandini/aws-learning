import { RDSClient } from "@aws-sdk/client-rds";
import { EC2Client } from "@aws-sdk/client-ec2";

// RDS uses its own client; EC2Client is used to find default VPC subnets/SGs
export const rds = new RDSClient({ region: "us-east-1" });
export const ec2 = new EC2Client({ region: "us-east-1" });

export const PREFIX = "aws-learning";

export const DAY_TAGS = [
  { Key: "project", Value: "aws-learning" },
  { Key: "day", Value: "05" },
];

// RDS tags use a different shape than EC2 tags
export const RDS_TAGS = [
  { Key: "project", Value: "aws-learning" },
  { Key: "day", Value: "05" },
];

export const DB_INSTANCE_ID = "aws-learning-day05-db";
export const DB_SUBNET_GROUP = "aws-learning-day05-subnet-group";
export const DB_SG_NAME = "aws-learning-day05-rds-sg";

// Credentials used when creating the DB instance
// In production, use Secrets Manager — never hardcode credentials
export const DB_USERNAME = "adminuser";
export const DB_PASSWORD = "Learning1234!";
export const DB_NAME = "learningdb";
