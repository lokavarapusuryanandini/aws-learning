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
| `npm run presigned` | Task 3 — Generate PUT/GET presigned URLs; backend uploads a buffer via PUT, fetches it back via GET and reads it as text |
| `npm run lifecycle` | Task 4 — Set lifecycle rules to auto-tier and expire objects |
| `npm run cleanup` | Empty all object versions + delete markers, then delete the bucket |

### Source files

| File | Purpose |
|------|---------|
| [src/createBucket.ts](02-s3/src/createBucket.ts) | Create bucket → block public access → enable versioning → tag |
| [src/uploadDownload.ts](02-s3/src/uploadDownload.ts) | PutObject, GetObject, ListObjectsV2, versioning demo, delete markers |
| [src/presignedUrl.ts](02-s3/src/presignedUrl.ts) | Generate PUT/GET presigned URLs; backend PUTs a text buffer via presigned URL, then GETs and reads the content back as text |
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
  │── fetch(url, PUT, buffer) ──▶ object stored in S3
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

---

## 03 — EC2 (Elastic Compute Cloud)

> **Folder:** [03-ec2/](03-ec2/)

### What it covers

Launching EC2 instances programmatically — key pairs, security groups, user data bootstrapping, and AMI creation using the AWS SDK v3.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run launch` | Task 1 — Resolve latest Amazon Linux 2023 AMI, create key pair + security group, launch `t3.micro`, wait for running, print SSH + HTTP commands |
| `npm run ami` | Task 2 — Find running instance by tag, create AMI with `NoReboot: true`, wait for available |
| `npm run cleanup` | Terminate instance → wait → deregister AMI → delete security group → delete key pair + local `.pem` |

### Source files

| File | Purpose |
|------|---------|
| [src/client.ts](03-ec2/src/client.ts) | Shared `EC2Client` and tag constants |
| [src/launchInstance.ts](03-ec2/src/launchInstance.ts) | Dynamic AMI lookup → create key pair (saves `.pem`) → create security group (SSH + HTTP) → launch instance with Apache user data → wait for running |
| [src/createAmi.ts](03-ec2/src/createAmi.ts) | Find instance by tag → create AMI with `NoReboot: true` → wait for available state |
| [src/cleanup.ts](03-ec2/src/cleanup.ts) | Terminate instance → wait for terminated → deregister AMI → delete security group → delete key pair + `.pem` file |

### Key concepts practiced

- **AMI** — OS + config snapshot; always resolve the ID dynamically, never hardcode it (IDs change per region and over time)
- **Key pair** — the private key is returned only once at creation; the script saves it immediately as a `.pem` file with `chmod 400`
- **Security group** — stateful virtual firewall; inbound rules are explicit, return traffic is allowed automatically
- **User data** — base64-encoded shell script that runs as root on first boot; used here to install and start Apache
- **Instance states** — `pending → running → stopping → stopped → terminated`; waiters poll until the target state is reached
- **AMI creation** — `NoReboot: true` creates the AMI without stopping the instance (fast, minor consistency trade-off)
- **Tag-based resource discovery** — all resources are tagged `project: aws-learning, day: 03` so cleanup finds them without hardcoding IDs

### Instance launch flow

```
launchInstance
  ├── DescribeImages        → latest Amazon Linux 2023 AMI ID
  ├── CreateKeyPair         → saves aws-learning-day03-key.pem
  ├── CreateSecurityGroup   → allows port 22 (SSH) + port 80 (HTTP)
  ├── RunInstances          → t3.micro with Apache user-data
  └── waitUntilRunning      → prints public IP + SSH/HTTP commands
```

### Resources created

- Key pair: `aws-learning-day03-key` (private key saved as `03-ec2/aws-learning-day03-key.pem`)
- Security group: `aws-learning-day03-sg` (ports 22 + 80 open)
- EC2 instance: `aws-learning-day03-instance` (`t3.micro`, Amazon Linux 2023, Apache on port 80)
- AMI: `aws-learning-day03-snapshot` (if `npm run ami` was run)

> Always run `npm run cleanup` after finishing — running EC2 instances accrue charges by the hour.

### Further reading

- [EC2 instance types](https://aws.amazon.com/ec2/instance-types/)
- [Amazon Machine Images](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html)
- [EC2 user data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
- [Security groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)

---

## 04 — VPC (Virtual Private Cloud)

> **Folder:** [04-vpc/](04-vpc/)

### What it covers

Building a custom VPC from scratch — CIDR blocks, Internet Gateway, route tables, and public/private subnets across multiple Availability Zones.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run vpc` | Task 1 — Create VPC (10.0.0.0/16), enable DNS, attach Internet Gateway, create public route table |
| `npm run subnets` | Task 2 — Create public subnet (us-east-1a) + private subnet (us-east-1b), associate route tables |
| `npm run cleanup` | Delete subnets → route tables → detach/delete IGW → delete VPC |

### Source files

| File | Purpose |
|------|---------|
| [src/client.ts](04-vpc/src/client.ts) | Shared `EC2Client` and tag constants |
| [src/createVpc.ts](04-vpc/src/createVpc.ts) | Create VPC → enable DNS → create + attach IGW → create public route table with 0.0.0.0/0 → IGW |
| [src/createSubnets.ts](04-vpc/src/createSubnets.ts) | Find VPC by tag → create public subnet (auto-assign IP, associated with public RT) + private subnet (main RT only) |
| [src/cleanup.ts](04-vpc/src/cleanup.ts) | Delete in dependency order: subnets → custom route tables → IGW → VPC |

### Key concepts practiced

- **VPC** — isolated virtual network; your own private section of AWS cloud
- **CIDR block** — IP range of the VPC (`10.0.0.0/16` = 65,536 addresses); subnets carve slices from this range
- **Internet Gateway** — the bridge between VPC and the public internet; one per VPC
- **Route table** — defines where traffic is forwarded; every subnet uses one
- **Public subnet** — subnet with a route table that has `0.0.0.0/0 → IGW`
- **Private subnet** — subnet with no route to IGW; traffic stays within VPC
- **Auto-assign public IP** — public subnet instances automatically get a public IP on launch
- **AZ spreading** — subnets live in one AZ; spread across AZs for high availability
- **NAT Gateway** — allows private subnet instances to reach the internet (outbound only); not covered here as it has an hourly cost

### VPC architecture

```
VPC (10.0.0.0/16)
  ├── Internet Gateway
  │
  ├── Public Route Table
  │     └── 0.0.0.0/0 → IGW
  │
  ├── Public Subnet  (10.0.0.0/24, us-east-1a)   ← uses public route table
  │     └── instances get public IP automatically
  │
  └── Private Subnet (10.0.1.0/24, us-east-1b)   ← uses VPC main route table
        └── no internet route; internal only
```

### Resources created

- VPC: `aws-learning-day04-vpc` (CIDR `10.0.0.0/16`, DNS enabled)
- Internet Gateway: `aws-learning-day04-igw`
- Public route table: `aws-learning-day04-public-rt` (route: `0.0.0.0/0 → IGW`)
- Public subnet: `aws-learning-day04-public-1a` (`10.0.0.0/24`, us-east-1a)
- Private subnet: `aws-learning-day04-private-1b` (`10.0.1.0/24`, us-east-1b)

> Always run `npm run cleanup` after finishing.

### Further reading

- [VPC concepts](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html)
- [Subnets](https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html)
- [Internet gateways](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html)
- [Route tables](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html)
