# AWS Learning — 20-Day Hands-On Series

TypeScript + AWS SDK v3 + CDK hands-on exercises across 20 AWS topics.

## Prerequisites

- Node.js >= 18
- AWS account with programmatic access configured (`aws configure`)
- Basic TypeScript knowledge

## Structure

Each folder is a self-contained npm workspace for one AWS service or concept.

```
01-iam/             Identity & Access Management
02-s3/              Simple Storage Service
03-ec2/             Elastic Compute Cloud
04-vpc/             Virtual Private Cloud
05-rds/             Relational Database Service
06-lambda/          Lambda Functions
07-apigateway/      API Gateway
08-dynamodb/        DynamoDB
09-sqs-sns/         SQS & SNS Messaging
10-cloudwatch/      CloudWatch Monitoring
11-cloudformation/  Infrastructure as Code (CloudFormation)
12-cdk/             AWS CDK
13-ecs-ecr/         ECS & ECR Containers
14-secrets-kms/     Secrets Manager & KMS
15-elb-asg/         Elastic Load Balancing & Auto Scaling
16-stepfunctions/   Step Functions
17-eventbridge/     EventBridge
18-cloudfront-r53/  CloudFront & Route 53
19-concepts/        Core AWS Concepts
20-project/         Capstone Project
```

## Setup

```bash
# Install all workspace dependencies from the repo root
npm install
```

---

## 01 — IAM (Identity & Access Management)

> **Folder:** [01-iam/](01-iam/)

### What it covers

Creating and managing IAM users, roles, and policies programmatically using the AWS SDK v3.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run user` | Task 1 — Create an IAM user with an inline S3 read-only policy and access keys |
| `npm run role` | Task 2 — Create a Lambda execution role with a trust policy and DynamoDB permissions |
| `npm run list` | Task 3 — List all IAM resources and simulate policy evaluation |
| `npm run cleanup` | Delete all resources created in this module |

### Source files

| File | Purpose |
|------|---------|
| [src/client.ts](01-iam/src/client.ts) | Shared `IAMClient` and `LEARNING_PREFIX` constant |
| [src/createUser.ts](01-iam/src/createUser.ts) | Create user → attach inline policy → create access key |
| [src/createRole.ts](01-iam/src/createRole.ts) | Create role with trust policy → attach managed + inline policies |
| [src/listResources.ts](01-iam/src/listResources.ts) | List users/roles/policies and run `SimulatePrincipalPolicy` |
| [src/cleanup.ts](01-iam/src/cleanup.ts) | Delete all Day 1 resources in the correct dependency order |

### Key concepts practiced

- **Authentication vs Authorization** — access keys prove identity; policies define what's allowed
- **Policy document structure** — `Effect`, `Action`, `Resource`, `Principal`, `Condition`
- **Inline vs Managed policies** — inline lives on one entity; managed policies are reusable
- **Trust policy vs Permission policy** — who can assume a role vs what the role can do
- **Policy evaluation order** — default deny → explicit allow → explicit deny wins
- **IAM is global** — users, roles, and policies have no region
- **Least privilege** — only grant the specific actions and resources actually needed

### Policy evaluation logic

```
1. Default: DENY everything
2. Evaluate all applicable policies
3. Any explicit Deny  → DENY (overrides all Allows)
4. Any explicit Allow → ALLOW
5. No Allow found     → DENY (implicit deny)
```

### Resources created

- IAM user: `aws-learning-dev-user` with an inline `S3ReadOnlyLearning` policy
- IAM role: `aws-learning-lambda-execution-role` with `AWSLambdaBasicExecutionRole` (managed) and `DynamoDBAccess` (inline)

> Always run `npm run cleanup` after finishing to avoid leaving unused resources in your account.

### Further reading

- [IAM Policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [When to use roles vs users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use.html)
- [IAM best practices — least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

## 02 — S3 (Simple Storage Service)

> **Folder:** [02-s3/](02-s3/)

### What it covers

Creating and managing S3 buckets, uploading/downloading objects, bucket policies, lifecycle rules, and presigned URLs using the AWS SDK v3.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run bucket` | Task 1 — Create a versioning-enabled private bucket with tags |
| `npm run upload` | Task 2 — Upload/download objects, list versions, demo delete markers |
| `npm run presigned` | Task 3 — Generate PUT/GET presigned URLs; upload a real image from backend and download it back |
| `npm run lifecycle` | Task 4 — Set lifecycle rules to auto-tier and expire objects |
| `npm run cleanup` | Empty all object versions + delete markers, then delete the bucket |

### Source files

| File | Purpose |
|------|---------|
| [src/createBucket.ts](02-s3/src/createBucket.ts) | Create bucket → block public access → enable versioning → tag |
| [src/uploadDownload.ts](02-s3/src/uploadDownload.ts) | PutObject, GetObject, ListObjectsV2, versioning demo, delete markers |
| [src/presignedUrl.ts](02-s3/src/presignedUrl.ts) | Generate PUT/GET presigned URLs; backend uploads `sample.png` and downloads it back as `downloaded.png` |
| [src/lifecycle.ts](02-s3/src/lifecycle.ts) | Lifecycle rules: Standard → IA → Glacier → expiry, temp file cleanup, old-version pruning |
| [src/cleanup.ts](02-s3/src/cleanup.ts) | Paginated delete of all versions + delete markers, then delete bucket |

### Key concepts practiced

- **Bucket names are globally unique** — across all AWS accounts, all regions
- **Block Public Access** — always on by default; keep it that way
- **Versioning** — overwriting a key creates a new version; deletions create a delete marker (old versions are preserved)
- **Storage classes** — Standard → Standard-IA → Glacier → Deep Archive (cost vs retrieval trade-off)
- **Lifecycle rules** — automatically transition or expire objects to save cost
- **Presigned URLs** — temporary signed URLs that allow GET or PUT without AWS credentials; bucket stays private
- **Backend vs frontend upload pattern** — backend generates the URL, client (or backend itself) uses plain `fetch` to PUT directly to S3

### Presigned URL flow

```
Backend                        S3
  │── getSignedUrl(PutObject) ──▶ returns signed URL
  │── fetch(url, PUT, image)  ──▶ object stored in S3
  │── getSignedUrl(GetObject) ──▶ returns signed URL
  │── fetch(url, GET)         ──▶ downloads object
```

### Resources created

- S3 bucket: `aws-learning-nandini` (versioning enabled, all public access blocked)
- Objects: `docs/hello.txt` (with versions), `uploads/avatar.png`

> Always run `npm run cleanup` after finishing — S3 charges for stored objects even when tiny.

### Further reading

- [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [S3 Lifecycle rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
