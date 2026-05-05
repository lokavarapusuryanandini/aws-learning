/**
 * DAY 2 — Task 4: S3 Lifecycle rules — auto-move/delete objects to save cost
 *
 * Concepts:
 *   - Lifecycle rules move objects between storage classes automatically
 *   - Storage class ladder: Standard → IA → Glacier → Deep Archive
 *   - Cost drops as you move down, but retrieval time/cost increases
 *   - Set expiry to auto-delete temp files
 */

import { PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET_NAME } from "./createBucket";

async function setLifecycleRules(): Promise<void> {
  console.log("\n--- Setting S3 Lifecycle Rules ---\n");

  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: BUCKET_NAME,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "MoveLogsToIA",
            Status: "Enabled",
            Filter: { Prefix: "logs/" }, // applies only to logs/ prefix
            Transitions: [
              {
                Days: 30,
                // After 30 days: move to Standard-IA (cheaper, min 30-day charge)
                StorageClass: "STANDARD_IA",
              },
              {
                Days: 90,
                // After 90 days: move to Glacier (very cheap, minutes-to-hours retrieval)
                StorageClass: "GLACIER",
              },
            ],
            Expiration: { Days: 365 }, // Delete after 1 year
          },
          {
            ID: "ExpireTempUploads",
            Status: "Enabled",
            Filter: { Prefix: "tmp/" },
            Expiration: { Days: 1 }, // Delete temp files after 1 day
          },
          {
            ID: "CleanupOldVersions",
            Status: "Enabled",
            Filter: { Prefix: "" }, // Applies to all objects
            NoncurrentVersionExpiration: { NoncurrentDays: 30 }, // Delete old versions after 30 days
          },
        ],
      },
    })
  );

  console.log("Lifecycle rules set:");
  console.log("  logs/     → Standard-IA at 30d → Glacier at 90d → deleted at 365d");
  console.log("  tmp/      → deleted after 1 day");
  console.log("  all objs  → old versions deleted after 30 days");
  console.log("\nStorage class costs (approximate):");
  console.log("  Standard:    $0.023/GB/month  — immediate access");
  console.log("  Standard-IA: $0.0125/GB/month — infrequent access, fast retrieval");
  console.log("  Glacier:     $0.004/GB/month  — retrieval: minutes to hours");
  console.log("  Deep Archive:$0.00099/GB/month — retrieval: 12 hours");
}

setLifecycleRules().catch(console.error);
