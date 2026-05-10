/**
 * DAY 2 — Cleanup: Delete all S3 resources created today
 *
 * S3 bucket deletion rules:
 *   1. Bucket must be empty before it can be deleted
 *   2. With versioning enabled, every object has versions + delete markers —
 *      both must be explicitly removed (DeleteObjects only removes current version)
 *   3. Repeat until no more versions remain (pagination)
 */

import {
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  type ObjectIdentifier,
} from "@aws-sdk/client-s3";
import { s3, BUCKET_NAME } from "./createBucket";

async function emptyVersionedBucket(): Promise<void> {
  console.log(`\nEmptying versioned bucket: ${BUCKET_NAME}`);

  let totalDeleted = 0;

  // Loop until all versions and delete markers are gone
  // (ListObjectVersions returns max 1000 per page)
  while (true) {
    const listResp = await s3.send(
      new ListObjectVersionsCommand({ Bucket: BUCKET_NAME })
    );

    const toDelete: ObjectIdentifier[] = [
      ...(listResp.Versions ?? []).map((v) => ({
        Key: v.Key!,
        VersionId: v.VersionId!,
      })),
      ...(listResp.DeleteMarkers ?? []).map((m) => ({
        Key: m.Key!,
        VersionId: m.VersionId!,
      })),
    ];

    if (toDelete.length === 0) break;

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: toDelete, Quiet: true },
      })
    );

    totalDeleted += toDelete.length;
    console.log(`  Deleted ${toDelete.length} versions/markers (total: ${totalDeleted})`);
  }

  console.log(`  Bucket emptied (${totalDeleted} versions removed)`);
}

async function deleteBucket(): Promise<void> {
  await s3.send(new DeleteBucketCommand({ Bucket: BUCKET_NAME }));
  console.log(`  Bucket deleted: ${BUCKET_NAME}`);
}

async function main(): Promise<void> {
  console.log("=== Cleaning up Day 2 — S3 resources ===");
  try {
    await emptyVersionedBucket();
    await deleteBucket();
  } catch (e: any) {
    console.log("Skipped (not found or already deleted):", e.message);
  }
  console.log("\nAll done! Your AWS account is clean.");
}

main().catch(console.error);
