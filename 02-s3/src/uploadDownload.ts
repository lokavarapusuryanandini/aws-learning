/**
 * DAY 2 — Task 2: Upload, download, list objects + versioning demo
 *
 * Concepts:
 *   - PutObject: upload content (string, Buffer, stream)
 *   - GetObject: download (returns a stream)
 *   - ListObjectsV2: paginated listing
 *   - Versioning: overwrite same key = new version, old preserved
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { s3, BUCKET_NAME } from "./createBucket";

const KEY = "docs/hello.txt";

async function uploadDownload(): Promise<void> {
  console.log(`\n--- S3 Upload/Download demo on: ${BUCKET_NAME} ---\n`);

  // Upload version 1
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: KEY,
      Body: "Hello from AWS Learning — Version 1",
      ContentType: "text/plain",
      Metadata: { author: "aws-learner", day: "02" }, // custom key-value pairs
    })
  );
  console.log("Uploaded v1:", KEY);

  // Upload version 2 (same key — creates a new version)
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: KEY,
      Body: "Hello from AWS Learning — Version 2 (updated)",
      ContentType: "text/plain",
    })
  );
  console.log("Uploaded v2:", KEY);

  // Download current version (always latest)
  const getResp = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: KEY })
  );
  const body = await streamToString(getResp.Body as Readable);
  console.log("\nDownloaded (latest):", body);

  // List all objects in bucket
  const listResp = await s3.send(
    new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: "docs/" })
  );
  console.log("\nObjects in bucket:");
  listResp.Contents?.forEach((obj) => {
    console.log(`  ${obj.Key} | ${obj.Size} bytes | Last modified: ${obj.LastModified}`);
  });

  // List all versions — shows both v1 and v2
  const versionsResp = await s3.send(
    new ListObjectVersionsCommand({ Bucket: BUCKET_NAME, Prefix: KEY })
  );
  console.log("\nVersions (versioning keeps every overwrite):");
  versionsResp.Versions?.forEach((v) => {
    const latest = v.IsLatest ? " <-- current" : "";
    console.log(`  VersionId: ${v.VersionId} | Modified: ${v.LastModified}${latest}`);
  });

  // Delete object — with versioning, creates a "delete marker" (not truly gone)
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: KEY }));
  console.log("\nDeleted (delete marker created — old versions still exist)");
}

// AWS SDK v3 returns streams — helper to convert to string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

uploadDownload().catch(console.error);
