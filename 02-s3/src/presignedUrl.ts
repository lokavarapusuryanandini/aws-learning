/**
 * DAY 2 — Task 3: Presigned URLs — share private files without making bucket public
 *
 * Concepts:
 *   - Presigned URL = temporary signed URL to GET or PUT an object
 *   - Signed with your credentials, valid for N seconds
 *   - Anyone with the URL can access (no AWS account needed)
 *   - Common pattern: backend generates URL, frontend uploads directly to S3
 */

import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET_NAME } from "./createBucket";

async function presignedUrlDemo(): Promise<void> {
  console.log("\n--- Presigned URL Demo ---\n");

  const key = "uploads/avatar.png";

  // Generate a PUT presigned URL (upload link — give to frontend)
  const putUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: "image/png",
    }),
    { expiresIn: 3600 } // valid for 1 hour
  );
  console.log("PUT presigned URL (upload — share with client):");
  console.log(putUrl);
  console.log("\nFrontend can now do:");
  console.log(`  fetch('${putUrl.slice(0, 80)}...', { method: 'PUT', body: fileBlob })`);

  // --- Backend upload example ---
  // Instead of giving the presigned URL to a frontend, the backend itself
  // can PUT directly to S3 using the URL (e.g. after processing a file).
  // fetch() is built-in from Node 18+; no extra dependency needed.
  const demoContent = Buffer.from("hello from backend");
  const uploadResp = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: demoContent,
  });
  if (uploadResp.ok) {
    console.log("\nBackend upload via presigned URL: success");
  } else {
    console.log("\nBackend upload failed:", uploadResp.status, await uploadResp.text());
  }

  // Generate a GET presigned URL (download link)
  const getUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    { expiresIn: 300 } // valid for 5 minutes
  );
  console.log("\nGET presigned URL (download — expires in 5 min):");
  console.log(getUrl); // open this in a browser or use it from the backend — valid for 5 min

  // --- Backend fetch using GET presigned URL ---
  // The same pattern works in reverse: backend fetches the file without
  // needing the AWS SDK — just a plain HTTP GET to the presigned URL.
  const downloadResp = await fetch(getUrl);
  if (downloadResp.ok) {
    const text = await downloadResp.text();
    console.log("\nBackend fetched via GET presigned URL:");
    console.log(" ", text); // prints: hello from backend
  } else {
    console.log("\nBackend fetch failed:", downloadResp.status, await downloadResp.text());
  }

  console.log("\nKey insight:");
  console.log("  - Bucket stays PRIVATE (no public access)");
  console.log("  - Backend controls who gets a URL and for how long");
  console.log("  - Files upload DIRECTLY to S3 (no traffic through your server)");
  console.log("  - This is how S3 file uploads work in every production app");
}

presignedUrlDemo().catch(console.error);
