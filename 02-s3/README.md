# Day 2 — S3 (Simple Storage Service)

## What you'll build
Bucket with versioning, upload/download files, lifecycle rules, presigned URLs.

## Setup
```bash
cd 02-s3
npm install
```

## Run the tasks (in order)
```bash
npm run bucket    # Create bucket with versioning + block public access
npm run upload    # Upload files, download, see versions
npm run lifecycle # Set storage class transition rules
npm run presigned # Generate presigned PUT/GET URLs
npm run cleanup   # Delete all objects + bucket
```

---

## Must-know concepts

### Storage classes (cost vs access speed)
| Class | Use case | Cost | Retrieval |
|-------|----------|------|-----------|
| Standard | Active data | $$$$ | Instant |
| Standard-IA | Monthly access | $$ | Instant |
| Glacier Instant | Quarterly access | $ | Instant |
| Glacier Flexible | Archives | $$ | Minutes–hours |
| Deep Archive | Legal hold | $ | 12 hours |

### Versioning
- Once enabled → every `PutObject` creates a new version
- Delete = "delete marker" added (old versions preserved)
- Restore by deleting the delete marker
- Cannot fully disable once enabled (only suspend)

### Presigned URLs — the production pattern
```
Client → POST /upload-url → Your API → generates presigned PUT URL → returns URL
Client → PUT file directly to S3 (using presigned URL) → S3
```
No file traffic through your backend server!

### Bucket policy vs IAM policy
- **IAM policy** = attached to a user/role (identity-based)
- **Bucket policy** = attached to the bucket (resource-based)
- Both must ALLOW for cross-account access
- For same-account: either one is sufficient

## Key S3 facts
- **Globally unique** bucket names across ALL AWS accounts
- **Eventual consistency** used to be a thing — now strongly consistent (since Dec 2020)
- Max object size: **5 TB** (use multipart upload for > 100 MB)
- Free tier: **5 GB** Standard + 20,000 GET + 2,000 PUT requests/month
