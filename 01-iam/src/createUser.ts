/**
 * DAY 1 — Task 1: Create an IAM user and attach an inline policy
 *
 * Concepts practiced:
 *   - CreateUser API
 *   - Inline policy JSON (Effect / Action / Resource)
 *   - PutUserPolicy (inline) vs AttachUserPolicy (managed)
 *   - Least privilege — only S3 read on a specific bucket prefix
 */

import {
  CreateUserCommand,
  PutUserPolicyCommand,
  CreateAccessKeyCommand,
  GetUserCommand,
} from "@aws-sdk/client-iam";
import { iamClient, LEARNING_PREFIX } from "./client";

const USERNAME = `${LEARNING_PREFIX}-dev-user`;

// This is what a least-privilege policy looks like in JSON.
// Effect: Allow | Deny
// Action: specific AWS API calls (s3:GetObject, not s3:*)
// Resource: specific ARN (not *)
const S3_READ_ONLY_POLICY = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "AllowS3ReadOnLearningBucket",
      Effect: "Allow",
      Action: [
        "s3:GetObject",
        "s3:ListBucket",
      ],
      Resource: [
        "arn:aws:s3:::aws-learning-bucket-*",
        "arn:aws:s3:::aws-learning-bucket-*/*",
      ],
    },
  ],
};

async function createUser(): Promise<void> {
  console.log(`\n--- Creating IAM user: ${USERNAME} ---\n`);

  // Step 1: Create the user
  const createResp = await iamClient.send(
    new CreateUserCommand({
      UserName: USERNAME,
      Tags: [
        { Key: "project", Value: "aws-learning" },
        { Key: "day", Value: "01" },
      ],
    })
  );
  console.log("User created:", createResp.User?.Arn);

  // Step 2: Attach inline policy (lives inside the user, not reusable)
  // Use managed policies (AWS or customer) for reusability across users/roles
  await iamClient.send(
    new PutUserPolicyCommand({
      UserName: USERNAME,
      PolicyName: "S3ReadOnlyLearning",
      PolicyDocument: JSON.stringify(S3_READ_ONLY_POLICY),
    })
  );
  console.log("Inline policy attached: S3ReadOnlyLearning");

  // Step 3: Create access keys (programmatic access)
  // In production: prefer roles over long-lived access keys
  const keyResp = await iamClient.send(
    new CreateAccessKeyCommand({ UserName: USERNAME })
  );
  const key = keyResp.AccessKey!;
  console.log("\nAccess key created:");
  console.log("  Access Key ID:", key.AccessKeyId);
  console.log("  Secret (shown once!):", key.SecretAccessKey);
  console.log("\nNOTE: In production, use IAM Roles — not access keys.");

  // Step 4: Verify — get user details
  const getResp = await iamClient.send(
    new GetUserCommand({ UserName: USERNAME })
  );
  console.log("\nUser details:", JSON.stringify(getResp.User, null, 2));
}

createUser().catch(console.error);
