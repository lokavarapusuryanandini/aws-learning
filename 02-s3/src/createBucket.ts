/**
 * DAY 2 — Task 1: Create S3 bucket with versioning enabled
 *
 * Concepts:
 *   - Bucket names are globally unique across ALL AWS accounts
 *   - Versioning: keeps all versions of every object
 *   - Block Public Access: the default, always keep this ON
 *   - Tags help with cost allocation and cleanup
 */

import {
  S3Client,
  CreateBucketCommand,
  PutBucketVersioningCommand,
  PutPublicAccessBlockCommand,
  PutBucketTaggingCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

export const s3 = new S3Client({ region: "us-east-1" });

// Bucket name must be globally unique — add a random suffix
export const BUCKET_NAME = `aws-learning-nandini`;

async function createBucket(): Promise<void> {
  console.log(`\n--- Creating S3 bucket: ${BUCKET_NAME} ---\n`);

  // Step 1: Create bucket
  // Note: us-east-1 does NOT use LocationConstraint (quirk of AWS)
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
  console.log("Bucket created:", BUCKET_NAME);

  // Step 2: Block all public access (security best practice)
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: BUCKET_NAME,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );
  console.log("Public access blocked");

  // Step 3: Enable versioning
  // Once enabled, can only be suspended (not fully disabled)
  await s3.send(
    new PutBucketVersioningCommand({
      Bucket: BUCKET_NAME,
      VersioningConfiguration: { Status: "Enabled" },
    })
  );
  console.log("Versioning enabled");

  // Step 4: Tag the bucket
  await s3.send(
    new PutBucketTaggingCommand({
      Bucket: BUCKET_NAME,
      Tagging: {
        TagSet: [
          { Key: "project", Value: "aws-learning" },
          { Key: "day", Value: "02" },
          { Key: "environment", Value: "dev" },
        ],
      },
    })
  );
  console.log("Tags applied");

  // Step 5: Verify bucket exists (HeadBucket = lightweight existence check)
  await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  console.log("\nBucket ready! ARN:", `arn:aws:s3:::${BUCKET_NAME}`);
  console.log("\nSave this name for other scripts:");
  console.log(`export BUCKET_NAME=${BUCKET_NAME}`);
}

createBucket().catch(console.error);
