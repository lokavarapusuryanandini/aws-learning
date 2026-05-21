/**
 * DAY 12 - CDK Stack definition
 *
 * Concepts:
 *   - CDK = Cloud Development Kit; write infrastructure in TypeScript/Python/Java/C#
 *   - Construct = the basic building block; can be a single resource or a pattern
 *   - L1 (Cfn*) = direct CloudFormation resource mapping (e.g. CfnBucket)
 *   - L2        = higher-level abstraction with sensible defaults (e.g. s3.Bucket)
 *   - L3        = patterns combining multiple L2s (e.g. ApplicationLoadBalancedFargateService)
 *   - App → Stack → Construct tree; CDK synthesises the tree to a CloudFormation template
 *   - RemovalPolicy.DESTROY = delete the resource when the stack is destroyed
 *   - autoDeleteObjects = CDK deploys a custom Lambda to empty the bucket before deletion
 *   - Grant methods = CDK's way to add IAM permissions (bucket.grantRead, table.grantReadWriteData)
 *   - CfnOutput = declares a CloudFormation Output (visible in console + importable by other stacks)
 *   - cdk synth = generate the CloudFormation template (look in cdk.out/)
 *   - cdk diff  = compare deployed stack with current code (like 'git diff' for infra)
 *   - cdk deploy = synthesise + upload assets + deploy/update the CloudFormation stack
 */

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class Day12Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── L2 Construct: S3 Bucket ──────────────────────────────────────────
    // L2 constructs have opinionated defaults: encryption at rest, versioning opt-in, etc.
    // Compare with L1 (CfnBucket) which is a 1:1 mirror of CloudFormation properties.
    const bucket = new s3.Bucket(this, "LearningBucket", {
      // No explicit bucketName → CDK generates a unique name (stackName + logicalId + hash)
      // This avoids naming conflicts across accounts and regions
      versioned: true,
      // BlockPublicAccess.BLOCK_ALL is the L2 default — secure by default
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // Encrypt at rest with S3-managed keys (SSE-S3) — L2 default
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // delete bucket when stack is destroyed
      autoDeleteObjects: true, // CDK deploys a helper Lambda to empty the bucket first
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // ── L2 Construct: Lambda Function ────────────────────────────────────
    // CDK automatically creates an IAM execution role with CloudWatch Logs permissions.
    // No need to manually create roles, policies, or attach managed policies.
    const fn = new lambda.Function(this, "LearningFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      // Code.fromInline = embed JS directly in the template (no S3 asset upload needed)
      // Use Code.fromAsset("./lambda") to point to a local directory (best for real projects)
      code: lambda.Code.fromInline(`
        const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
        const s3 = new S3Client({});

        exports.handler = async (event) => {
          const bucket = process.env.BUCKET_NAME;
          let objectCount = 0;
          try {
            const resp = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
            objectCount = resp.KeyCount ?? 0;
          } catch (e) {
            // bucket might be empty — that's fine
          }
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "Hello from CDK Lambda!",
              bucketName: bucket,
              objectCount,
              stackName: process.env.STACK_NAME,
              region: process.env.AWS_REGION,
              time: new Date().toISOString(),
            }),
          };
        };
      `),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        STACK_NAME: this.stackName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      description: "aws-learning Day 12 - CDK Lambda",
    });

    // Grant Lambda read access to the S3 bucket
    // CDK generates the correct IAM policy and attaches it to the Lambda execution role
    // Equivalent to manually adding s3:GetObject + s3:ListBucket permissions
    bucket.grantRead(fn);

    // ── Lambda Function URL ───────────────────────────────────────────────
    // Direct HTTPS endpoint on the Lambda function; simpler than API Gateway
    // No extra cost beyond Lambda invocation
    const fnUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // public endpoint (add COGNITO/IAM in prod)
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["*"],
      },
    });

    // ── CloudFormation Outputs ────────────────────────────────────────────
    // Visible in the CloudFormation console and returned by `cdk deploy`
    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
      description: "The S3 bucket created by CDK",
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, "FunctionArn", {
      value: fn.functionArn,
      description: "Lambda function ARN",
    });

    new cdk.CfnOutput(this, "FunctionUrl", {
      value: fnUrl.url,
      description: "Lambda Function URL — open in browser or use curl",
      exportName: `${this.stackName}-FunctionUrl`,
    });
  }
}
