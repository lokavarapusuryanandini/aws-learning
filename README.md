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

---

## 05 — RDS (Relational Database Service)

> **Folder:** [05-rds/](05-rds/)

### What it covers

Launching a managed PostgreSQL RDS instance, connecting to it with `pg` (node-postgres), and running parameterised SQL queries from Node.js.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run db` | Task 1 — Find the default VPC, create a DB subnet group + security group, launch a `db.t3.micro` PostgreSQL instance, wait for available, print endpoint |
| `npm run connect` | Task 2 — Resolve the endpoint via SDK, connect with `pg`, create a table, insert rows, run SELECT/UPDATE/aggregate queries, demo a transaction |
| `npm run cleanup` | Delete RDS instance (no snapshot) → wait → delete subnet group → delete security group |

### Source files

| File | Purpose |
|------|---------|
| [src/client.ts](05-rds/src/client.ts) | Shared `RDSClient`, `EC2Client`, constants, and credentials |
| [src/createDb.ts](05-rds/src/createDb.ts) | Find default VPC subnets → create security group (port 5432) → create DB subnet group → launch PostgreSQL instance → wait + print endpoint |
| [src/connectAndQuery.ts](05-rds/src/connectAndQuery.ts) | Resolve endpoint from SDK → connect via `pg` → CREATE TABLE → INSERT → SELECT, UPDATE, aggregate, transaction demo |
| [src/cleanup.ts](05-rds/src/cleanup.ts) | Delete RDS instance (SkipFinalSnapshot) → wait for deletion → delete subnet group → delete security group |

### Key concepts practiced

- **RDS = managed database** — AWS patches the OS, runs backups, handles failover; you just connect
- **DB Subnet Group** — tells RDS which subnets (and therefore which AZs) it can use; needs subnets in at least 2 AZs
- **Security Group for RDS** — inbound rule on port 5432 (PostgreSQL); the DB is unreachable without it
- **db.t3.micro** — smallest RDS instance class; Free Tier eligible (750 hours/month for 12 months)
- **PubliclyAccessible: true** — allows connections from outside the VPC (needed for local testing)
- **Multi-AZ** — standby replica in a second AZ for automatic failover; not used here (doubles cost)
- **BackupRetentionPeriod: 0** — disables automated backups; saves cost and speeds up deletion for learning
- **SkipFinalSnapshot** — allows deleting the instance without creating a final backup
- **Parameterised queries** — `$1, $2` placeholders prevent SQL injection; always use these, never interpolate user input
- **SSL** — RDS requires SSL by default; `rejectUnauthorized: false` skips cert validation (OK for learning)
- **Transaction** — `BEGIN` / `COMMIT` / `ROLLBACK` ensures multiple writes succeed or fail together

### Instance creation flow

```
createDb
  ├── DescribeVpcs (isDefault=true)     -> default VPC + subnets
  ├── CreateSecurityGroup               -> port 5432 open
  ├── CreateDBSubnetGroup               -> registers subnets with RDS
  ├── CreateDBInstance                  -> db.t3.micro PostgreSQL
  └── waitUntilDBInstanceAvailable      -> prints endpoint + psql command
```

### Query demo flow

```
connectAndQuery
  ├── DescribeDBInstances  -> resolve endpoint from SDK (no hardcoding)
  ├── pg.Client.connect    -> SSL connection to RDS
  ├── CREATE TABLE IF NOT EXISTS products
  ├── INSERT (3 rows, parameterised)
  ├── SELECT all / WHERE price < 100 / aggregate stats
  ├── UPDATE stock (RETURNING)
  └── Transaction: transfer stock between two products
```

### Resources created

- Security group: `aws-learning-day05-rds-sg` (inbound TCP 5432)
- DB subnet group: `aws-learning-day05-subnet-group`
- RDS instance: `aws-learning-day05-db` (`db.t3.micro`, PostgreSQL 16, `learningdb` database)

> Always run `npm run cleanup` after finishing — RDS instances accrue charges by the hour.

### Further reading

- [RDS PostgreSQL overview](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [DB Subnet Groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html)
- [Connecting to RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToPostgreSQLInstance.html)
- [node-postgres (pg)](https://node-postgres.com/)

---

## 06 — Lambda (Serverless Functions)

> **Folder:** [06-lambda/](06-lambda/)

### What it covers

Deploying a TypeScript Lambda function from Node.js using the SDK — compiling the handler, zipping it, creating an IAM execution role, deploying, invoking with several payloads, reading CloudWatch logs, and cleaning up.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run deploy` | Task 1 — Compile `handler.ts` → JS → ZIP, create IAM execution role, create/update Lambda function, wait for Active state |
| `npm run invoke` | Task 2 — Invoke the function 6 times with different payloads (echo, reverse, upper, env, unknown, throw) and print results |
| `npm run logs` | Task 3 — List log streams for the function, fetch and pretty-print events from the most recent stream |
| `npm run cleanup` | Delete Lambda function → detach policies → delete IAM role |

### Source files

| File | Purpose |
|------|---------|
| [src/client.ts](06-lambda/src/client.ts) | Shared `LambdaClient`, `CloudWatchLogsClient`, `IAMClient`, and constants |
| [src/handler.ts](06-lambda/src/handler.ts) | The Lambda function itself — compiled to `handler.js` and deployed in a ZIP |
| [src/deployFunction.ts](06-lambda/src/deployFunction.ts) | Compile handler → ZIP with `jszip` → ensure IAM role → create/update Lambda function |
| [src/invokeFunction.ts](06-lambda/src/invokeFunction.ts) | Invoke with `RequestResponse` (sync), decode Uint8Array payload, show `FunctionError` for thrown errors |
| [src/viewLogs.ts](06-lambda/src/viewLogs.ts) | `DescribeLogStreams` (sorted by last event time) → `GetLogEvents` from most recent stream, colour-coded output |
| [src/cleanup.ts](06-lambda/src/cleanup.ts) | Delete function → list + detach all attached policies → delete IAM role |

### Key concepts practiced

- **Deployment package** — Lambda code must be a ZIP file with `handler.js` at the root; `tsc` compiles `handler.ts` to JS
- **Handler config** — `"handler.handler"` means: file `handler.js`, exported function `handler`
- **IAM execution role** — Lambda assumes this role at runtime; needs `AWSLambdaBasicExecutionRole` to write logs
- **Trust policy** — allows `lambda.amazonaws.com` to call `sts:AssumeRole`
- **IAM propagation delay** — new roles take ~10 seconds before Lambda can use them; always add a wait after creation
- **`waitUntilFunctionActive`** — new functions go `Pending → Active`; wait before invoking
- **`waitUntilFunctionUpdated`** — code updates are async; wait before invoking the new version
- **`InvocationType: "RequestResponse"`** — synchronous; caller blocks until function returns (max 15 minutes)
- **`InvocationType: "Event"`** — asynchronous; Lambda queues it and returns HTTP 202 immediately
- **Response payload** — returned as `Uint8Array`; decode with `TextDecoder` → parse as JSON
- **`FunctionError`** — set to `"Handled"` when your code throws; payload contains `errorMessage` + `stackTrace`
- **CloudWatch log group** — automatically created at `/aws/lambda/<name>` when Lambda first runs
- **Log streams** — one stream per execution environment instance; cold start = new stream
- **START / END / REPORT lines** — Lambda automatically writes these around every invocation; REPORT shows billed duration + memory used
- **`LogType: "Tail"`** — returns last 4 KB of logs inline in the invoke response (handy for quick debugging)

### Handler actions

The deployed function supports these `action` values:

| `action` | `input` | Result |
|----------|---------|--------|
| `echo` | any string | Returns the string unchanged |
| `reverse` | any string | Returns the string reversed |
| `upper` | any string | Returns the string uppercased |
| `env` | — | Returns environment variables (custom + Lambda built-ins) |
| `throw` | — | Throws an error; demonstrates `FunctionError` handling |

### Deployment flow

```
deployFunction
  ├── tsc src/handler.ts -> dist/lambda-build/handler.js
  ├── jszip: handler.js -> deployment.zip (in memory)
  ├── IAM: GetRole (exists?) -> CreateRole + AttachPolicy + wait 10s
  └── Lambda: GetFunction (exists?)
        ├── no  -> CreateFunction + waitUntilFunctionActive
        └── yes -> UpdateFunctionCode + waitUntilFunctionUpdated
```

### Resources created

- IAM role: `aws-learning-day06-lambda-role` (with `AWSLambdaBasicExecutionRole`)
- Lambda function: `aws-learning-day06` (`nodejs20.x`, 128 MB, 10s timeout)
- CloudWatch log group: `/aws/lambda/aws-learning-day06` (persists after cleanup — delete manually)

> Always run `npm run cleanup` after finishing.

### Further reading

- [Lambda programming model](https://docs.aws.amazon.com/lambda/latest/dg/foundation-progmodel.html)
- [Lambda execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [Invoking Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/lambda-invocation.html)
- [CloudWatch Logs for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)

---

## 07 — API Gateway (REST API)

> **Folder:** [07-apigateway/](07-apigateway/)

### What it covers

Building a REST API in API Gateway backed by a Lambda function using **Lambda Proxy Integration** — a single Lambda handles all routes internally.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run deploy` | Task 1 — Compile `handler.ts`, ZIP it, create IAM role + Lambda function, create REST API with `{proxy+}` resource, add Lambda permission, deploy to `dev` stage |
| `npm run test` | Task 2 — Discover the invoke URL via SDK, make 7 real HTTP requests (GET, POST, path params, 404) and print responses |
| `npm run cleanup` | Delete REST API → Lambda function → IAM role |

### Source files

| File | Purpose |
|------|---------|
| [src/client.ts](07-apigateway/src/client.ts) | Shared `APIGatewayClient`, `LambdaClient`, `IAMClient`, constants |
| [src/handler.ts](07-apigateway/src/handler.ts) | Lambda function for API GW — routes GET /hello, POST /echo, GET /info, GET /items/:id, POST /items, 404 |
| [src/createApi.ts](07-apigateway/src/createApi.ts) | Build Lambda → REST API with `{proxy+}` catch-all → Lambda permission → deploy stage |
| [src/testApi.ts](07-apigateway/src/testApi.ts) | Find API by name via SDK, make HTTP calls with Node `https` module |
| [src/cleanup.ts](07-apigateway/src/cleanup.ts) | `DeleteRestApi` (removes everything) → delete Lambda → delete IAM role |

### Key concepts practiced

- **REST API** — the API Gateway resource holding your API definition (resources, methods, integrations, deployments)
- **Resource** — a URL path segment; `{proxy+}` = greedy proxy, catches any path under `/`
- **Method** — the HTTP verb on a resource; `ANY` matches all verbs in one rule
- **Lambda Proxy Integration** — API GW passes the full HTTP request to Lambda; Lambda controls the entire response
- **`integrationHttpMethod: "POST"`** — Lambda invocations always use POST internally, regardless of what the caller sends
- **Deployment** — a snapshot of your API configuration; required before the API is reachable
- **Stage** — a named live environment (`dev`, `prod`) pointing to a Deployment; part of the invoke URL
- **Invoke URL** — `https://{apiId}.execute-api.{region}.amazonaws.com/{stage}`
- **Lambda permission** — resource-based policy that allows `apigateway.amazonaws.com` to invoke the function
- **`event.path`** — the URL path in the Lambda event (`/hello`, `/items/42`); used for routing
- **`event.body`** — raw string; must `JSON.parse()` it; typed as `string | null`
- **Proxy handler return** — must be `{ statusCode, headers, body (string) }`; `body` must be a string

### API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hello?name=X` | Returns a greeting |
| POST | `/echo` | Echoes the request body + metadata |
| GET | `/info` | Returns stage, IP, user-agent, function name |
| GET | `/items/:id` | Simulated item fetch with path param |
| POST | `/items` | Simulated item creation |
| * | `/*` | 404 with list of available routes |

### Deploy flow

```
createApi
  ├── tsc handler.ts -> dist/lambda-build/handler.js
  ├── jszip -> deployment.zip
  ├── IAM: CreateRole (trust: lambda) + AttachPolicy + wait 10s
  ├── Lambda: CreateFunction / UpdateFunctionCode + waitUntilFunctionActive
  ├── APIGW: CreateRestApi
  ├── APIGW: GetResources -> root "/" ID
  ├── APIGW: CreateResource "{proxy+}"
  ├── APIGW: PutMethod ANY + PutIntegration AWS_PROXY (root + {proxy+})
  ├── Lambda: AddPermission (principal: apigateway.amazonaws.com)
  └── APIGW: CreateDeployment (stageName: "dev")
```

### Resources created

- IAM role: `aws-learning-day07-lambda-role`
- Lambda function: `aws-learning-day07`
- REST API: `aws-learning-day07`
- Stage: `dev`

> Always run `npm run cleanup` after finishing.

### Further reading

- [API Gateway REST API concepts](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-basic-concept.html)
- [Lambda proxy integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)
- [Stages and deployments](https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-publish.html)

---

## 08 — DynamoDB (NoSQL)

> **Folder:** [08-dynamodb/](08-dynamodb/)

### What it covers

Creating a DynamoDB table, performing all CRUD operations + batch + transactions via the `DynamoDBDocumentClient`, adding a Global Secondary Index, and reading from DynamoDB Streams.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run table` | Task 1 — Create `aws-learning-day08-orders` table (partition key: `userId`, sort key: `orderId`, PAY_PER_REQUEST), wait for ACTIVE |
| `npm run crud` | Task 2 — PutItem, GetItem with projection, UpdateItem with condition, Query, BatchWriteItem, TransactWriteItems, Scan (anti-pattern demo), DeleteItem |
| `npm run gsi` | Task 3 — Add `status-createdAt-index` GSI via `UpdateTable`, wait for ACTIVE, query the GSI to find all pending orders sorted by date |
| `npm run streams` | Task 4 — Enable `NEW_AND_OLD_IMAGES` stream, generate INSERT/MODIFY/DELETE records, read them back using `GetShardIterator` + `GetRecords` |
| `npm run cleanup` | Delete the table (removes data, GSIs, and stream in one call) |

### Source files

| File | Purpose |
|------|---------|
| [src/client.ts](08-dynamodb/src/client.ts) | `DynamoDBClient` (low-level) + `DynamoDBDocumentClient` (auto-marshal/unmarshal), table constants |
| [src/createTable.ts](08-dynamodb/src/createTable.ts) | `CreateTableCommand` with composite PK, PAY_PER_REQUEST billing, `waitUntilTableExists` |
| [src/crudOperations.ts](08-dynamodb/src/crudOperations.ts) | Full CRUD + Query + Scan + BatchWrite + TransactWrite via `DynamoDBDocumentClient` |
| [src/createGsi.ts](08-dynamodb/src/createGsi.ts) | `UpdateTable` to add GSI, poll until GSI ACTIVE, query by `status` + `createdAt` range |
| [src/enableStreams.ts](08-dynamodb/src/enableStreams.ts) | Enable streams, write records, `DescribeStream` → `GetShardIterator` → `GetRecords` |
| [src/cleanup.ts](08-dynamodb/src/cleanup.ts) | `DeleteTableCommand` + `waitUntilTableNotExists` |

### Key concepts practiced

- **Partition key** — determines the physical partition; high cardinality = even distribution
- **Sort key** — enables range queries within a partition (`begins_with`, `between`, `>`, `<`)
- **`DynamoDBDocumentClient`** — wraps raw client; automatically converts JS types to DynamoDB `AttributeValue` format and back
- **PAY_PER_REQUEST** — on-demand billing; no capacity planning; scales instantly; pay per read/write
- **`PutItem`** — insert or fully replace an item (upsert by primary key)
- **`UpdateItem`** — modify specific attributes without rewriting the whole item (cheaper + atomic)
- **`ConditionExpression`** — only perform write if a condition is true; prevents lost updates in concurrent access
- **`UpdateExpression`** — `SET`, `REMOVE`, `ADD`, `DELETE` attribute changes
- **`ProjectionExpression`** — return only specific attributes; saves read cost and bandwidth
- **`Query`** — reads items with the SAME partition key; can filter on sort key; efficient O(log n)
- **`Scan`** — reads ALL items; O(n); use only for infrequent full-table operations or on small tables
- **`BatchWriteItem`** — up to 25 puts/deletes in one network round-trip
- **`TransactWriteItems`** — up to 100 operations; all succeed or all fail (ACID transactions)
- **GSI** — secondary index with a different partition key; enables queries on any attribute; eventually consistent
- **GSI projection** — `ALL` copies every attribute; `KEYS_ONLY` copies only key attributes
- **DynamoDB Streams** — ordered log of item changes; records available for 24 hours
- **`StreamViewType: NEW_AND_OLD_IMAGES`** — captures both before and after state of every change
- **Shard iterator** — cursor into a stream shard; `TRIM_HORIZON` = start from oldest, `LATEST` = only new records

### Table schema

```
Table: aws-learning-day08-orders
  PK:  userId   (String) — partition key
  SK:  orderId  (String) — sort key
  GSI: status-createdAt-index
         Hash:  status    (String)
         Range: createdAt (String / ISO 8601)
         Projection: ALL
```

### Resources created

- DynamoDB table: `aws-learning-day08-orders`
- GSI: `status-createdAt-index`
- Stream (enabled but no persistent resource to clean up)

> Always run `npm run cleanup` after finishing.

### Further reading

- [DynamoDB core concepts](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)
- [DynamoDBDocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_lib_dynamodb.html)
- [Query vs Scan](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html)
- [GSI design patterns](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)

---

## 09 — SQS + SNS (Messaging)

> **Folder:** [09-sqs-sns/](09-sqs-sns/)

### What it covers

SQS queues (send/receive/delete, long polling, visibility timeout), SNS topics (publish/subscribe), the fan-out pattern, message filtering, and Dead Letter Queues.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run queue` | Task 1 — Create standard queue, send single + batch messages, receive with long polling, acknowledge via delete, show queue stats |
| `npm run topic` | Task 2 — Create SNS topic, subscribe an SQS queue, add access policy, publish 3 messages, receive from queue and show SNS envelope |
| `npm run fanout` | Task 3 — One SNS topic → 3 SQS queues (order-processor, email-notifier, analytics); analytics has a filter policy; show all queues receiving the same event |
| `npm run dlq` | Task 4 — Create DLQ + main queue with `RedrivePolicy` (maxReceiveCount=3, 5s timeout); simulate 3 failures; message moves to DLQ |
| `npm run cleanup` | List queues by prefix → delete; list topics → filter by name → delete |

### Key concepts practiced

- **Standard vs FIFO** — standard = high throughput, at-least-once, best-effort order; FIFO = exactly-once, strict order
- **VisibilityTimeout** — message stays hidden from other consumers for N seconds after a receive
- **Long polling** — `WaitTimeSeconds > 0` waits up to 20s; reduces empty poll costs vs short polling
- **ReceiptHandle** — token needed to `DeleteMessage`; expires after visibility timeout
- **BatchSend** — `SendMessageBatch` up to 10 messages per API call
- **SNS envelope** — when SNS delivers to SQS, the message body is an SNS JSON wrapper; `JSON.parse(body).Message` gets the original payload
- **SQS access policy** — queue must explicitly allow `sqs:SendMessage` from the SNS topic ARN
- **Fan-out** — publish once to SNS, all subscribed queues receive simultaneously; decouple producers from consumers
- **FilterPolicy** — subscriber-level attribute filter; e.g. only receive messages with `orderValue >= 100`
- **Dead Letter Queue** — after `maxReceiveCount` failed receives, SQS moves the message to the DLQ on the next visibility timeout expiry
- **MessageAttributes** — metadata on the message (key-value); useful for filtering without parsing the body

### Resources created

- SQS queues: `aws-learning-day09-main`, `aws-learning-day09-sns-subscriber`, `aws-learning-day09-dlq`, `aws-learning-day09-dlq-demo-main`, `aws-learning-day09-order-*` (3 fan-out queues)
- SNS topics: `aws-learning-day09-topic`, `aws-learning-day09-orders`

> Always run `npm run cleanup` after finishing. Note: deleted queue names cannot be reused for 60 seconds.

### Further reading

- [SQS concepts](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)
- [SNS pub/sub](https://docs.aws.amazon.com/sns/latest/dg/welcome.html)
- [Fan-out pattern](https://docs.aws.amazon.com/sns/latest/dg/sns-common-scenarios.html)
- [DLQ setup](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)

---

## 10 — CloudWatch (Metrics, Alarms, Logs, Dashboards)

> **Folder:** [10-cloudwatch/](10-cloudwatch/)

### What it covers

Publishing custom metrics, creating metric alarms (average and P99), writing structured logs and querying them with Logs Insights, and building a multi-widget CloudWatch dashboard.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run metrics` | Task 1 — Simulate 10 minutes of `ApiLatency`, `ErrorCount`, `RequestCount` datapoints; query back with `GetMetricData` including a math expression for error rate |
| `npm run alarm` | Task 2 — Create avg latency > 500ms alarm + P99 > 1000ms alarm; demo state transitions with `SetAlarmState` |
| `npm run logs` | Task 3 — Create log group (7-day retention), push 50 structured JSON events, run 3 Logs Insights queries (error count by path, avg latency, recent errors) |
| `npm run dashboard` | Task 4 — Create dashboard with line chart, single-value widgets, alarm status, and embedded Logs Insights query |
| `npm run cleanup` | Delete alarms → delete log group → delete dashboard |

### Key concepts practiced

- **Namespace** — logical grouping; `"MyApp/Prod"` vs `"aws-learning/Day10"`
- **Dimensions** — key-value pairs that qualify a metric; you can query with different dimension combinations
- **Period** — aggregation window in seconds (60, 300); must be a multiple of 60 for standard resolution
- **Statistic** — `Average`, `Sum`, `Min`, `Max`, `SampleCount`, `p99`, `p95`, etc.
- **GetMetricData math expression** — combine metrics: `"(errors / requests) * 100"`
- **Alarm states** — `OK`, `ALARM`, `INSUFFICIENT_DATA`
- **EvaluationPeriods + DatapointsToAlarm** — M-of-N alarm: alarm if 2 out of 3 periods breach threshold
- **TreatMissingData** — `notBreaching` (default-OK), `breaching` (default-ALARM), `ignore`, `missing`
- **SetAlarmState** — manually override state for testing notification integrations
- **Extended statistics** — `p99`, `p95`, etc. for tail latency alarms
- **Log group retention** — always set a retention policy; default is "never expire" (accumulates cost)
- **PutLogEvents** — events must be sorted by timestamp ascending; max 1 MB per batch
- **Logs Insights** — `fields`, `filter`, `parse`, `stats`, `sort`, `limit`; runs against log groups
- **Dashboard body** — JSON string with `widgets` array; 24-column grid; widget types: `metric`, `alarm`, `text`, `log`

### Resources created

- Custom metric namespace: `aws-learning/Day10`
- Alarms: `aws-learning-day10-high-latency`, `aws-learning-day10-high-latency-p99`
- Log group: `/aws-learning/day10` (7-day retention)
- Dashboard: `aws-learning-day10`

> Always run `npm run cleanup` after finishing.

### Further reading

- [CloudWatch custom metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html)
- [Metric math](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html)
- [Logs Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [Dashboard body format](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html)

---

## 11 — CloudFormation (Infrastructure as Code)

> **Folder:** [11-cloudformation/](11-cloudformation/)

### What it covers

Defining infrastructure as a JSON template, deploying a stack, updating it via a change set (with preview), and detecting configuration drift.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run deploy` | Task 1 — Define template (S3 bucket + SSM parameter, Parameters, Outputs, Fn::Sub, Fn::GetAtt), create stack, wait for `CREATE_COMPLETE`, print outputs + resources |
| `npm run update` | Task 2 — Create change set (suspend versioning), preview changes (Action, Replacement), execute change set, wait for `UPDATE_COMPLETE` |
| `npm run drift` | Task 3 — Trigger drift detection, poll until `DETECTION_COMPLETE`, show per-resource drift status (IN_SYNC / MODIFIED / DELETED) |
| `npm run cleanup` | Delete stack → wait for `DELETE_COMPLETE` |

### Key concepts practiced

- **Template** — declarative JSON/YAML; describes desired state; CloudFormation diffs and applies changes
- **Parameters** — values passed at deploy/update time; `AllowedValues` for validation
- **Resources** — the AWS resources to create; only key supported resource types need to be declared
- **`Ref`** — returns the primary identifier of a resource (bucket name, queue URL, etc.)
- **`Fn::GetAtt`** — returns a specific attribute of a resource (bucket ARN, etc.)
- **`Fn::Sub`** — string substitution: `${AWS::AccountId}`, `${AWS::Region}`, `${StackName}`
- **Outputs** — values exported from the stack; viewable in console; importable by other stacks via `Fn::ImportValue`
- **DeletionPolicy** — `Delete` (default), `Retain` (keep resource after stack delete), `Snapshot`
- **Change set** — preview of planned changes before applying; shows `Add`, `Modify`, `Remove` + whether resource is replaced
- **Replacement** — `True` = resource must be re-created (e.g. renaming an S3 bucket); causes downtime
- **Drift** — resource's actual config differs from CloudFormation's expected config (manual change outside CFN)
- **Rollback** — if a resource fails to create/update, CloudFormation rolls back to the last stable state

### Resources created

- S3 bucket: `aws-learning-day11-{accountId}` (versioned)
- SSM parameter: `/aws-learning/day11/bucket-name`

> Always run `npm run cleanup` after finishing. Note: S3 bucket must be empty before stack deletion.

### Further reading

- [CloudFormation template anatomy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-anatomy.html)
- [Change sets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html)
- [Drift detection](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html)
- [Intrinsic functions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html)

---

## 12 — CDK (Cloud Development Kit)

> **Folder:** [12-cdk/](12-cdk/)

### What it covers

Writing infrastructure as TypeScript using AWS CDK — L1/L2/L3 constructs, automatic IAM generation, stack synthesis, and deploying a stack with S3 + Lambda + Function URL.

### Run order

```bash
cd 12-cdk
npm install
npm run synth    # generate CloudFormation template (no AWS calls)
npm run diff     # compare with deployed stack
npm run deploy   # deploy to AWS
# curl the Function URL printed in the output
npm run destroy  # delete all stack resources
```

> **Prerequisite:** CDK bootstrap must be done once per account/region: `npx cdk bootstrap`

### Source files

| File | Purpose |
|------|---------|
| [bin/app.ts](12-cdk/bin/app.ts) | CDK App entry point — instantiates `Day12Stack` with region + tags |
| [lib/day12-stack.ts](12-cdk/lib/day12-stack.ts) | Stack definition — S3 Bucket (L2), Lambda (L2, inline code), Function URL, CfnOutputs |
| [cdk.json](12-cdk/cdk.json) | CDK CLI config — specifies the `app` command (`ts-node bin/app.ts`) |

### Key concepts practiced

- **App → Stack → Construct tree** — CDK synthesises the tree into a CloudFormation template
- **L1 constructs (`Cfn*`)** — 1:1 CloudFormation resource mapping; all properties explicit
- **L2 constructs** — higher-level; smart defaults (encryption, block public access, log permissions)
- **L3 / Patterns** — pre-built combinations (e.g. `ApplicationLoadBalancedFargateService`)
- **Automatic IAM** — CDK generates minimal IAM policies when you call `bucket.grantRead(fn)`
- **`RemovalPolicy.DESTROY`** — delete the resource when the stack is destroyed (default: RETAIN)
- **`autoDeleteObjects: true`** — CDK deploys a helper Lambda to empty the bucket before deletion
- **`Code.fromInline`** — embed JS directly in the template; use `Code.fromAsset` for real projects
- **Function URL** — direct HTTPS endpoint on Lambda; no API Gateway needed; free beyond Lambda cost
- **`CfnOutput`** — declares a CloudFormation Output; printed by `cdk deploy` and visible in console
- **`cdk synth`** — synthesise without deploying; inspect generated template in `cdk.out/`
- **`cdk diff`** — compare deployed stack with current CDK code (like `git diff` for infrastructure)
- **CDK bootstrap** — one-time setup per account/region; deploys a bootstrap stack with an S3 bucket for CDK assets

### Stack contents

```
Day12Stack
  ├── LearningBucket (s3.Bucket L2)
  │     versioned, encrypted, block-public, DESTROY policy, auto-empty
  ├── LearningFunction (lambda.Function L2)
  │     nodejs20.x, inline code, reads BUCKET_NAME from env
  │     IAM role auto-created; bucket.grantRead() adds s3:GetObject + s3:ListBucket
  ├── LearningFunctionFunctionUrl
  │     authType: NONE, CORS: *
  └── Outputs: BucketName, FunctionArn, FunctionUrl
```

### Further reading

- [CDK concepts](https://docs.aws.amazon.com/cdk/v2/guide/core_concepts.html)
- [L1/L2/L3 constructs](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html)
- [CDK API reference (TypeScript)](https://docs.aws.amazon.com/cdk/api/v2/)
- [CDK bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)

## 13 — ECS + ECR (Containers)

> **Folder:** [13-ecs-ecr/](13-ecs-ecr/)

### What it covers

Building a Docker container, pushing it to Amazon ECR, creating an ECS cluster, registering a task definition, and running the container on ECS using Fargate.

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run ecr` | Task 1 — Create an ECR repository for storing Docker images |
| `npm run push` | Task 2 — Authenticate Docker with ECR, build the app image, tag it, and push it to ECR |
| `npm run cluster` | Task 3 — Create an ECS cluster |
| `npm run task` | Task 4 — Register a Fargate task definition and run the container on ECS |
| `npm run cleanup` | Delete ECS tasks → cluster → ECR repository and images |

### Source files

| File | Purpose |
|------|---------|
| [src/createRepository.ts](13-ecs-ecr/src/createRepository.ts) | Create ECR repository and print repository URI |
| [src/pushImage.ts](13-ecs-ecr/src/pushImage.ts) | Login Docker to ECR, build image, tag image, push image |
| [src/createCluster.ts](13-ecs-ecr/src/createCluster.ts) | Create ECS cluster |
| [src/runTask.ts](13-ecs-ecr/src/runTask.ts) | Register Fargate task definition and run ECS task |
| [src/cleanup.ts](13-ecs-ecr/src/cleanup.ts) | Stop tasks → delete cluster → delete ECR repository |

### App structure

```text
13-ecs-ecr/
├── app/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── src/
│   ├── createRepository.ts
│   ├── pushImage.ts
│   ├── createCluster.ts
│   ├── runTask.ts
│   └── cleanup.ts
```

## Key concepts practiced

### Docker fundamentals
- **Docker image** — packaged application with code, runtime, dependencies, and OS layers  
- **Dockerfile** — instructions used to build the image  
- **Container** — running instance of a Docker image  

### AWS Container Services
- **ECR (Elastic Container Registry)** — private AWS Docker registry for storing images  
- **ECS (Elastic Container Service)** — AWS service for running and managing containers  
- **Fargate** — serverless compute engine for containers; AWS manages the servers  
- **EC2 launch type** — you manage EC2 servers yourself and ECS schedules containers on them  

### ECS Core Components
- **Cluster** — logical group where ECS tasks/services run  
- **Task Definition** — blueprint describing containers, CPU, memory, ports, image, and networking  
- **Task** — running instance of a task definition  
- **Execution Role** — IAM role ECS uses to pull images from ECR and send logs  

### Networking
- **awsvpc network mode** — each Fargate task gets its own ENI and private IP  
- **Public subnet** — subnet with internet access; required when assigning public IPs  
- **Port mapping** — maps container port to accessible network port  

### Docker build flow

```bash
# Build image from Dockerfile
docker build -t aws-learning-day13 ./app

# Run locally
docker run -p 3000:3000 aws-learning-day13
```

### ECR push flow

```text
Local Docker Image
        │
        ├── docker login to ECR
        ├── docker tag
        └── docker push
                │
                ▼
        Amazon ECR Repository
```

### ECS Fargate flow

```text
ECS Cluster
    │
    └── RunTask
            │
            ├── Task Definition
            │      ├── CPU / Memory
            │      ├── Container Image (ECR)
            │      ├── Port Mapping
            │      └── Execution Role
            │
            └── Fargate launches container
```

### Resources created

- ECR repository: `aws-learning-day13`
- ECS cluster: `aws-learning-day13-cluster`
- ECS task definition: `aws-learning-day13-task`
- ECS task: running container from ECR image
- IAM role: `ecsTaskExecutionRole`

### Important Fargate requirements

- `networkMode` must be `"awsvpc"`
- `requiresCompatibilities` must include `"FARGATE"`

#### Task definition requires

- CPU
- Memory
- Execution role ARN

#### RunTask requires

- Subnet IDs
- Public IP assignment (for internet access)

- Docker image must already exist in ECR

### Common errors practiced

| Error | Cause |
|---|---|
| `No Container Instances were found` | Tried EC2 launch type without ECS container instances |
| `Fargate requires execution role ARN` | Missing `executionRoleArn` |
| `unable to assume the role` | Incorrect IAM trust policy or missing permissions |
| `Cannot find module '/app/server.js'` | Dockerfile copied files incorrectly |
| `Docker pipe error` | Docker Desktop not running |

### Example task definition settings

```ts
networkMode: "awsvpc",
requiresCompatibilities: ["FARGATE"],
cpu: "256",
memory: "512"
```

### Resources cleanup order

```text
1. Stop running ECS tasks
2. Delete ECS cluster
3. Delete ECR images
4. Delete ECR repository
```

> Always run `npm run cleanup` after finishing — ECR images and ECS resources can incur charges.

### Further reading

- [Amazon ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Amazon ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)

## 14 — Secrets Manager + KMS

> **Folder:** `14-secrets-kms/`

### What it covers

Managing application secrets securely using AWS Secrets Manager and encrypting/decrypting data using AWS KMS (Key Management Service).

### Tasks

| Script | What it does |
|--------|-------------|
| `npm run secret` | Task 1 — Create and store a secret in AWS Secrets Manager |
| `npm run kms` | Task 2 — Create a KMS key, encrypt plaintext, and decrypt it back |
| `npm run rotate` | Task 3 — Rotate/update an existing secret with a new version |
| `npm run cleanup` | Delete the created secret |

### Source files

| File | Purpose |
|------|---------|
| `src/storeSecret.ts` | Create a secret and store credentials securely in Secrets Manager |
| `src/encryptDecrypt.ts` | Create a KMS key and perform encryption/decryption |
| `src/rotation.ts` | Update the secret value to simulate secret rotation |
| `src/cleanup.ts` | Delete the created secret |
| `tsconfig.json` | TypeScript configuration |

### Key concepts practiced

- **Secrets Manager** — managed service for securely storing secrets like passwords, API keys, and tokens
- **KMS (Key Management Service)** — managed encryption service for creating and controlling encryption keys
- **Secret rotation** — updating secret values periodically for better security
- **Customer managed keys** — KMS keys created and controlled by your AWS account
- **Encryption** — converting plaintext into ciphertext using a cryptographic key
- **Decryption** — converting encrypted ciphertext back into readable plaintext
- **Envelope encryption** — AWS services commonly encrypt data using data keys protected by KMS keys
- **IAM permissions** — access to secrets and keys is controlled through IAM policies
- **Secrets versioning** — each secret update creates a new version automatically
- **Force delete** — removes secrets immediately without recovery window

### Secrets Manager flow

```text
Application
     │
     ├── CreateSecret
     │
     ▼
AWS Secrets Manager
     │
     ├── Stores encrypted secret
     └── Maintains secret versions
```

### KMS encryption flow

```text
Plaintext
    │
    ├── EncryptCommand
    │
    ▼
Ciphertext
    │
    ├── DecryptCommand
    │
    ▼
Plaintext
```

### Resources created

- Secret: `aws-learning-day14-secret`
- KMS Key: dynamically generated customer-managed encryption key

> Always run `npm run cleanup` after finishing — unused secrets and KMS keys may incur charges.

### Further reading

- AWS Secrets Manager Documentation
- AWS KMS Documentation
- Envelope Encryption
- Secret Rotation Best Practices

# 15 — ELB + ASG (Auto Scaling) + Load Testing

> **Folder:** [15-elb-asg/](15-elb-asg/)

## What it covers

Building a scalable AWS architecture using **Application Load Balancer (ALB)** + **Auto Scaling Group (ASG)** with EC2 instances behind a target group, and verifying it using a Node.js load test.

---

## Tasks

| Script | What it does |
|--------|-------------|
| `npm run launch` | Creates Launch Template → ALB → Target Group → Listener → ASG (2 EC2 instances running Apache) |
| `npm run scale` | Runs load test against ALB and verifies 200 responses from all instances |
| `npm run cleanup` | Deletes ASG → ALB → Target Group → Launch Template → EC2 instances |

---

## Architecture
User
↓
ALB (Load Balancer)
↓
Target Group
↓
Auto Scaling Group
↓
EC2 Instances (Apache + User Data)


---

## Key Concepts Practiced

- **Launch Template** — blueprint for EC2 (AMI, instance type, user data, security groups)
- **Auto Scaling Group (ASG)** — maintains desired number of EC2 instances automatically
- **Desired Capacity** — number of instances ASG keeps running (here: 2)
- **Min/Max Size** — scaling boundaries (2–4)
- **Application Load Balancer (ALB)** — distributes traffic across healthy instances
- **Target Group** — registers EC2 instances for ALB routing
- **Health Checks** — ALB removes unhealthy instances automatically
- **User Data Script** — installs Apache and serves response (`Hello from ASG instance`)
- **Subnets (Public)** — required for ALB + internet access
- **Security Groups** — controls ALB (80) and EC2 access

---

## Load Test Output
Request 1 → Status: 200
Request 2 → Status: 200
...
Request 30 → Status: 200

---

## Flow


Request → ALB → Target Group → EC2 (ASG) → Apache Response


---

## Resources Created

- Launch Template: `aws-learning-day15-lt`
- ALB: `aws-learning-day15-lb`
- Target Group: `aws-learning-day15-tg`
- Auto Scaling Group: `aws-learning-day15-asg`
- EC2 Instances: 2 running Apache

---

## Cleanup Note

Always run cleanup to avoid charges:

```bash
npm run cleanup
```

Deletes all AWS resources created in this module.

## Further reading

- https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html — Application Load Balancer (ALB) concepts and routing
- https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html — Auto Scaling Groups and scaling policies
- https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html — Launch Templates for EC2 configuration
- https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/target-groups.html — Target Groups and health checks
- https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Scenarios.html — VPC networking, public subnets, and internet access patterns

# 16 — Step Functions (Serverless Orchestration)

> **Folder:** [16-stepfunctions/](16-stepfunctions/)

## What it covers

Building a **serverless workflow orchestration system** using AWS Step Functions to coordinate multiple steps with branching and parallel execution.

---

## Tasks

| Script | What it does |
|--------|-------------|
| `npm run build` | Compile TypeScript code |
| `npm run create` | Create IAM role + Step Function state machine |
| `npm run execute` | Start workflow execution with input |
| `npm run cleanup` | Delete state machine and IAM role |

---

## Key Concepts Practiced

- **Step Functions** — orchestrates AWS services in a workflow
- **State Machine** — JSON definition of workflow logic
- **Pass State** — passes data without processing
- **Parallel State** — runs multiple branches at the same time
- **Choice State (concept)** — conditional branching in workflows
- **Execution Tracking** — monitor step-by-step workflow execution
- **IAM Role for Step Functions** — permissions to invoke AWS services

---

## Architecture Flow
Start
↓
Validate Input (Pass)
↓
Process Order (Pass)
↓
Parallel Execution
├── Notify User
└── Store Analytics
↓
Success End State


---

## Example Input

```json id="sf16in"
{
  "orderId": "123",
  "amount": 250
}
```

## Example Output
{
  "status": "SUCCESS",
  "message": "Workflow completed successfully"
}

## Resources Created
Step Function: aws-learning-day16-workflow
IAM Role: aws-learning-day16-role

## Setup
```bash
npm install
npm run create
Run Workflow
npm run execute
```
## Cleanup
```bash
npm run cleanup
```
Deletes all Step Functions and IAM roles created.

⚠️ Note
Step Functions are billed per state transition
Always cleanup after testing to avoid charges

## Further reading
https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html — Step Functions overview
https://docs.aws.amazon.com/step-functions/latest/dg/concepts-state-machine.html — State machine concepts
https://docs.aws.amazon.com/step-functions/latest/dg/concepts-states.html — Types of states (Pass, Task, Choice, Parallel)
https://docs.aws.amazon.com/step-functions/latest/dg/bp-lambda.html — Using Lambda with Step Functions

# 🚀 Day 17 — EventBridge

> **Folder:** [17-eventbridge/](17-eventbridge/)

---

## 📌 Overview

This project demonstrates **Amazon EventBridge**, a fully managed event routing service used to build event-driven architectures.

It shows how to:

- Create an EventBridge Event Bus  
- Define Event Rules (event filtering and routing)  
- Publish custom events using AWS SDK v3  
- Route events to targets (Lambda / logs / services)  

---

## 🧩 What it covers

- EventBridge Event Bus creation  
- Custom event publishing using `PutEvents`  
- Event pattern matching (rules)  
- Event routing to targets  
- Serverless event-driven architecture  

---

## ⚙️ Tasks

| Script | What it does |
|--------|-------------|
| `npm run create` | Creates EventBridge event bus and rule |
| `npm run publish` | Publishes custom event to EventBridge |
| `npm run cleanup` | Deletes event bus and rules |

---

## 🏗️ Architecture Flow

```text
Application (Node.js SDK)
        │
        ▼
EventBridge Event Bus
        │
        ▼
Event Rule (Filter Pattern)
        │
        ▼
Target (Lambda / SQS / Logs)
```
## 📤 Example Event

```json
{
  "source": "aws.learning.day17",
  "detail-type": "orderCreated",
  "detail": {
    "orderId": "123",
    "amount": 250,
    "status": "CREATED"
  }
}
```

## 🎯 Key Concepts Practiced

- **Event Bus** — central pipeline for receiving events  
- **Custom Events** — application-generated events  
- **Event Pattern** — JSON rules used for filtering events  
- **Rules** — match events and send them to targets  
- **Decoupled systems** — producers and consumers are independent  
- **At-least-once delivery** — events may be delivered multiple times  
- **Serverless routing** — no infrastructure management required  

# 🔄 Event Flow

```text
Producer (Node.js App)
        │
        ├── PutEvents (AWS SDK)
        ▼
EventBridge Event Bus
        │
        ├── Rule: orderCreated
        ▼
Target (Lambda / SQS / Logging)
```

# 🧱 Resources Created

- Event Bus: `aws-learning-day17-bus`
- Event Rule: `aws-learning-day17-rule`
- Targets: Lambda / Log Group / SQS (based on setup)

# ⚠️ Cleanup

Always delete AWS resources after testing to avoid charges:

```bash
npm run cleanup
```

This removes:

- EventBridge rules
- Event bus
- Associated targets

# 📚 Further Reading

- https://docs.aws.amazon.com/eventbridge/latest/userguide/what-is-amazon-eventbridge.html — EventBridge overview
- https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html — Event patterns
- https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html — Rules in EventBridge
- https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-putevents.html — PutEvents API