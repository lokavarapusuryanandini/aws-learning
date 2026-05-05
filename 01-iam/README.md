# Day 1 — IAM (Identity & Access Management)

## What you'll build
Create IAM users, roles, and policies via TypeScript using AWS SDK v3.

## Setup
```bash
# From repo root, configure AWS credentials first:
aws configure
# Enter: Access Key ID, Secret, region (us-east-1), output (json)

cd 01-iam
npm install
```

## Run the tasks
```bash
npm run user      # Task 1: Create user + inline policy + access key
npm run role      # Task 2: Create Lambda execution role
npm run list      # Task 3: List all IAM resources + simulate policy
npm run cleanup   # Always run this at the end!
```

---

## Concepts you must understand

### 1. Authentication vs Authorization
- **Authentication** = Proving who you are (access keys, MFA, SSO)
- **Authorization** = What you're allowed to do (IAM policies)

### 2. Policy Document structure
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "OptionalStatementId",
    "Effect": "Allow",          // or "Deny"
    "Principal": { ... },       // WHO (only in trust/resource policies)
    "Action": ["s3:GetObject"], // WHAT API calls
    "Resource": ["arn:..."],    // ON WHAT resource
    "Condition": { ... }        // WHEN (optional)
  }]
}
```

### 3. Two types of policies
| Type | Scope | Reusable? | Use when |
|------|-------|-----------|----------|
| **Inline** | Attached to one entity | No | Strict 1:1 relationship needed |
| **Managed** | Standalone policy | Yes | Shared across multiple users/roles |

AWS Managed = AWS maintains it (e.g. `AmazonS3ReadOnlyAccess`)  
Customer Managed = You create and maintain it

### 4. Trust policy vs Permission policy
- **Trust policy** — WHO can assume the role (`AssumeRolePolicyDocument`)
- **Permission policy** — WHAT the role can do once assumed

```
Lambda function --> assumes --> IAM Role --> has permissions --> DynamoDB
                  (trust policy)              (permission policy)
```

### 5. Policy evaluation logic (memorize this)
1. Default: **DENY everything**
2. Evaluate all applicable policies
3. Any **explicit Deny** → DENY (overrides everything)
4. Any **explicit Allow** → ALLOW
5. No Allow found → DENY (implicit deny)

### 6. IAM is GLOBAL
IAM users, roles, and policies are global — no region needed.

### 7. Roles over users (production rule)
- EC2, Lambda, ECS → attach IAM Role (no keys stored)
- Human devs → use SSO/Identity Center, not long-lived access keys
- CI/CD → use OIDC federation (GitHub Actions → IAM Role)

---

## ARN format
```
arn:aws:iam::123456789012:user/john
     ^    ^   ^            ^
  partition  account-id  resource
           service
```

## Theory to read
- [IAM Policy evaluation logic (AWS docs)](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [When to use roles vs users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use.html)
- [Least privilege principle](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## What's next
Day 2 uses S3 — you'll create a bucket policy and see how resource-based policies interact with identity-based policies.
