/**
 * DAY 6 - Task 1: Deploy a Lambda function
 *
 * Concepts:
 *   - Deployment package = ZIP file containing your compiled handler.js at the root
 *   - IAM execution role = Lambda assumes this role at runtime; needs CloudWatch Logs write access
 *   - AWSLambdaBasicExecutionRole = AWS-managed policy; allows writing to CloudWatch Logs
 *   - Runtime = the language + version Lambda uses (nodejs20.x)
 *   - Handler = "filename.exportedFunctionName" (e.g. "handler.handler")
 *   - Environment variables = key-value pairs injected into process.env at runtime
 *   - Memory + Timeout = tunable; more memory = more CPU; default timeout is 3 seconds
 *   - IAM propagation delay = new roles take ~10 seconds to be usable by Lambda
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import JSZip from "jszip";
import {
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  waitUntilFunctionActive,
  waitUntilFunctionUpdated,
} from "@aws-sdk/client-lambda";
import {
  CreateRoleCommand,
  GetRoleCommand,
  AttachRolePolicyCommand,
} from "@aws-sdk/client-iam";
import {
  lambda,
  iam,
  FUNCTION_NAME,
  ROLE_NAME,
  BASIC_EXECUTION_POLICY,
} from "./client";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(PROJECT_ROOT, "dist", "lambda-build");

// --- Step 1: Compile handler.ts → handler.js ---
function buildHandler(): void {
  console.log("Building handler.ts...");
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  // Compile only handler.ts to plain CommonJS JS
  // Uses the project's installed TypeScript (ts-node devDep)
  execSync(
    [
      "npx tsc",
      "--outDir dist/lambda-build",
      "--module commonjs",
      "--target ES2020",
      "--esModuleInterop",
      "--skipLibCheck",
      "--noEmit false",
      "src/handler.ts",
    ].join(" "),
    { cwd: PROJECT_ROOT, stdio: "inherit" }
  );

  if (!fs.existsSync(path.join(BUILD_DIR, "handler.js"))) {
    throw new Error("Compilation failed: dist/lambda-build/handler.js not found");
  }
  console.log("Compiled -> dist/lambda-build/handler.js");
}

// --- Step 2: Create a ZIP buffer containing handler.js ---
async function createZip(): Promise<Buffer> {
  console.log("Creating deployment ZIP...");
  const zip = new JSZip();
  const handlerJs = fs.readFileSync(path.join(BUILD_DIR, "handler.js"), "utf8");
  // Lambda expects the handler file at the root of the ZIP
  zip.file("handler.js", handlerJs);
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  console.log(`ZIP created: ${(buffer.length / 1024).toFixed(1)} KB`);
  return buffer;
}

// --- Step 3: Ensure the IAM execution role exists ---
async function ensureIamRole(): Promise<string> {
  // Check if role already exists
  const existing = await iam.send(new GetRoleCommand({ RoleName: ROLE_NAME })).catch(() => null);
  if (existing?.Role?.Arn) {
    console.log(`IAM role already exists: ${existing.Role.Arn}`);
    return existing.Role.Arn;
  }

  console.log(`Creating IAM role: ${ROLE_NAME}`);

  // Trust policy = who can assume this role
  // Lambda service needs to assume this role when executing your function
  const trustPolicy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "lambda.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  });

  const createResp = await iam.send(
    new CreateRoleCommand({
      RoleName: ROLE_NAME,
      AssumeRolePolicyDocument: trustPolicy,
      Description: "aws-learning day 06 - Lambda execution role",
      Tags: [
        { Key: "project", Value: "aws-learning" },
        { Key: "day", Value: "06" },
      ],
    })
  );
  const roleArn = createResp.Role!.Arn!;
  console.log(`IAM role created: ${roleArn}`);

  // Attach the AWS-managed policy that allows writing to CloudWatch Logs
  await iam.send(
    new AttachRolePolicyCommand({
      RoleName: ROLE_NAME,
      PolicyArn: BASIC_EXECUTION_POLICY,
    })
  );
  console.log("Attached AWSLambdaBasicExecutionRole");

  // IAM changes take ~10 seconds to propagate — Lambda will fail with
  // "cannot be assumed" if you deploy immediately after creating the role
  console.log("Waiting 10 seconds for IAM role to propagate...");
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  return roleArn;
}

// --- Step 4: Create or update the Lambda function ---
async function deployLambda(zipBuffer: Buffer, roleArn: string): Promise<string> {
  const zipBytes = new Uint8Array(zipBuffer);

  // Check if the function already exists
  const existing = await lambda
    .send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }))
    .catch(() => null);

  if (existing?.Configuration?.FunctionArn) {
    // Update the code of an existing function
    console.log(`Updating existing function: ${FUNCTION_NAME}`);
    await lambda.send(
      new UpdateFunctionCodeCommand({
        FunctionName: FUNCTION_NAME,
        ZipFile: zipBytes,
      })
    );
    // Wait for the update to finish before the function is usable
    await waitUntilFunctionUpdated(
      { client: lambda, maxWaitTime: 120 },
      { FunctionName: FUNCTION_NAME }
    );
    console.log("Function updated");
    return existing.Configuration.FunctionArn;
  }

  // Create a new function
  console.log(`Creating Lambda function: ${FUNCTION_NAME}`);
  const resp = await lambda.send(
    new CreateFunctionCommand({
      FunctionName: FUNCTION_NAME,
      Runtime: "nodejs20.x",
      Role: roleArn,
      // "handler.handler" = file handler.js, exported function named handler
      Handler: "handler.handler",
      Code: { ZipFile: zipBytes },
      Description: "aws-learning day 06 - demo Lambda function",
      Timeout: 10,        // seconds; default is 3; max is 900 (15 min)
      MemorySize: 128,    // MB; more memory = more vCPU; min 128 MB
      Environment: {
        Variables: {
          DAY: "06",
          STAGE: "learning",
        },
      },
      Tags: {
        project: "aws-learning",
        day: "06",
      },
    })
  );

  // Wait for the function to transition from Pending to Active
  await waitUntilFunctionActive(
    { client: lambda, maxWaitTime: 120 },
    { FunctionName: FUNCTION_NAME }
  );
  console.log("Function created and active");
  return resp.FunctionArn!;
}

async function main(): Promise<void> {
  console.log("=== Day 6 - Deploy Lambda Function ===\n");

  buildHandler();
  const zipBuffer = await createZip();
  const roleArn = await ensureIamRole();
  const functionArn = await deployLambda(zipBuffer, roleArn);

  console.log("\n=== Deployment Complete ===");
  console.log(`  Function name: ${FUNCTION_NAME}`);
  console.log(`  Function ARN:  ${functionArn}`);
  console.log(`  Role ARN:      ${roleArn}`);
  console.log("\nNext: run 'npm run invoke' to test the function");
}

main().catch(console.error);
