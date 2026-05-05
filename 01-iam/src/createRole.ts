/**
 * DAY 1 — Task 2: Create an IAM Role with a trust policy
 *
 * Concepts practiced:
 *   - Trust policy: WHO can assume this role (Principal)
 *   - Permission policy: WHAT the role can do
 *   - AssumeRole flow (used by EC2, Lambda, cross-account)
 *   - Difference between trust policy and permission policy
 */

import {
  CreateRoleCommand,
  AttachRolePolicyCommand,
  PutRolePolicyCommand,
  GetRoleCommand,
} from "@aws-sdk/client-iam";
import { iamClient, LEARNING_PREFIX } from "./client";

const ROLE_NAME = `${LEARNING_PREFIX}-lambda-execution-role`;

// TRUST POLICY — answers: "Who is allowed to assume this role?"
// Here: Lambda service can assume this role (sts:AssumeRole)
// Other common principals: ec2.amazonaws.com, ecs-tasks.amazonaws.com
const TRUST_POLICY = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "AllowLambdaToAssume",
      Effect: "Allow",
      Principal: {
        Service: "lambda.amazonaws.com",  // Lambda service identity
      },
      Action: "sts:AssumeRole",
    },
  ],
};

// PERMISSION POLICY — answers: "What can the role do once assumed?"
const LAMBDA_PERMISSIONS = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "AllowDynamoDBAccess",
      Effect: "Allow",
      Action: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ],
      Resource: "arn:aws:dynamodb:us-east-1:*:table/aws-learning-*",
    },
    {
      Sid: "AllowCloudWatchLogs",
      Effect: "Allow",
      Action: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      Resource: "arn:aws:logs:*:*:*",
    },
  ],
};

async function createRole(): Promise<void> {
  console.log(`\n--- Creating IAM Role: ${ROLE_NAME} ---\n`);

  // Step 1: Create role with trust policy
  const createResp = await iamClient.send(
    new CreateRoleCommand({
      RoleName: ROLE_NAME,
      // Trust policy goes in AssumeRolePolicyDocument (NOT policy)
      AssumeRolePolicyDocument: JSON.stringify(TRUST_POLICY),
      Description: "Lambda execution role for aws-learning project",
      Tags: [
        { Key: "project", Value: "aws-learning" },
        { Key: "day", Value: "01" },
      ],
    })
  );
  console.log("Role created:", createResp.Role?.Arn);

  // Step 2: Attach AWS Managed policy (pre-built by AWS, reusable)
  // AWSLambdaBasicExecutionRole = CloudWatch Logs access
  await iamClient.send(
    new AttachRolePolicyCommand({
      RoleName: ROLE_NAME,
      PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    })
  );
  console.log("Managed policy attached: AWSLambdaBasicExecutionRole");

  // Step 3: Add inline policy for DynamoDB
  await iamClient.send(
    new PutRolePolicyCommand({
      RoleName: ROLE_NAME,
      PolicyName: "DynamoDBAccess",
      PolicyDocument: JSON.stringify(LAMBDA_PERMISSIONS),
    })
  );
  console.log("Inline policy attached: DynamoDBAccess");

  // Step 4: Inspect the role
  const getResp = await iamClient.send(
    new GetRoleCommand({ RoleName: ROLE_NAME })
  );
  console.log("\nRole ARN:", getResp.Role?.Arn);
  console.log("Trust policy:", decodeURIComponent(getResp.Role?.AssumeRolePolicyDocument ?? ""));
}

createRole().catch(console.error);
