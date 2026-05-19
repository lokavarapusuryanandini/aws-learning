/**
 * DAY 7 - Task 1: Deploy Lambda + create REST API Gateway
 *
 * Concepts:
 *   - REST API = the API Gateway resource that holds your API definition
 *   - Resource = a URL path segment (/hello, /echo, {proxy+})
 *   - Method = HTTP verb on a resource (GET, POST, ANY)
 *   - {proxy+} = "greedy" path variable; catches /anything/and/everything
 *   - Integration = how API GW forwards requests (AWS_PROXY = pass-through to Lambda)
 *   - integrationHttpMethod = ALWAYS "POST" for Lambda, regardless of API method
 *   - Deployment = a snapshot of the API definition
 *   - Stage = a named endpoint (dev/prod) that points to a deployment
 *   - Lambda permission = resource-based policy allowing API GW to invoke the function
 *   - Invoke URL = https://{apiId}.execute-api.{region}.amazonaws.com/{stage}
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import JSZip from "jszip";
import {
  CreateRestApiCommand,
  GetResourcesCommand,
  CreateResourceCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  CreateDeploymentCommand,
  GetRestApisCommand,
} from "@aws-sdk/client-api-gateway";
import {
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  AddPermissionCommand,
  waitUntilFunctionActive,
  waitUntilFunctionUpdated,
} from "@aws-sdk/client-lambda";
import {
  CreateRoleCommand,
  GetRoleCommand,
  AttachRolePolicyCommand,
} from "@aws-sdk/client-iam";
import {
  apigw,
  lambdaClient,
  iam,
  REGION,
  API_NAME,
  FUNCTION_NAME,
  ROLE_NAME,
  STAGE_NAME,
  BASIC_EXECUTION_POLICY,
} from "./client";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(PROJECT_ROOT, "dist", "lambda-build");

// ── 1. Compile handler.ts ──────────────────────────────────────────────────
function buildHandler(): void {
  console.log("Building handler.ts...");
  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
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

// ── 2. Zip the compiled handler ─────────────────────────────────────────────
async function createZip(): Promise<Buffer> {
  console.log("Creating deployment ZIP...");
  const zip = new JSZip();
  zip.file("handler.js", fs.readFileSync(path.join(BUILD_DIR, "handler.js"), "utf8"));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  console.log(`ZIP: ${(buffer.length / 1024).toFixed(1)} KB`);
  return buffer;
}

// ── 3. IAM execution role ───────────────────────────────────────────────────
async function ensureIamRole(): Promise<string> {
  const existing = await iam.send(new GetRoleCommand({ RoleName: ROLE_NAME })).catch(() => null);
  if (existing?.Role?.Arn) {
    console.log(`IAM role exists: ${existing.Role.Arn}`);
    return existing.Role.Arn;
  }
  console.log(`Creating IAM role: ${ROLE_NAME}`);
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
  const resp = await iam.send(
    new CreateRoleCommand({
      RoleName: ROLE_NAME,
      AssumeRolePolicyDocument: trustPolicy,
      Description: "aws-learning day 07 - Lambda execution role for API Gateway",
      Tags: [{ Key: "project", Value: "aws-learning" }, { Key: "day", Value: "07" }],
    })
  );
  await iam.send(
    new AttachRolePolicyCommand({ RoleName: ROLE_NAME, PolicyArn: BASIC_EXECUTION_POLICY })
  );
  console.log("Attached AWSLambdaBasicExecutionRole");
  console.log("Waiting 10s for IAM role to propagate...");
  await new Promise((r) => setTimeout(r, 10_000));
  return resp.Role!.Arn!;
}

// ── 4. Lambda function ──────────────────────────────────────────────────────
async function deployLambda(zip: Buffer, roleArn: string): Promise<string> {
  const zipBytes = new Uint8Array(zip);
  const existing = await lambdaClient
    .send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }))
    .catch(() => null);

  if (existing?.Configuration?.FunctionArn) {
    console.log(`Updating Lambda: ${FUNCTION_NAME}`);
    await lambdaClient.send(
      new UpdateFunctionCodeCommand({ FunctionName: FUNCTION_NAME, ZipFile: zipBytes })
    );
    await waitUntilFunctionUpdated(
      { client: lambdaClient, maxWaitTime: 120 },
      { FunctionName: FUNCTION_NAME }
    );
    return existing.Configuration.FunctionArn;
  }

  console.log(`Creating Lambda: ${FUNCTION_NAME}`);
  const resp = await lambdaClient.send(
    new CreateFunctionCommand({
      FunctionName: FUNCTION_NAME,
      Runtime: "nodejs20.x",
      Role: roleArn,
      Handler: "handler.handler",
      Code: { ZipFile: zipBytes },
      Description: "aws-learning day 07 - API Gateway backend",
      Timeout: 10,
      MemorySize: 128,
      Environment: { Variables: { DAY: "07", STAGE: STAGE_NAME } },
      Tags: { project: "aws-learning", day: "07" },
    })
  );
  await waitUntilFunctionActive(
    { client: lambdaClient, maxWaitTime: 120 },
    { FunctionName: FUNCTION_NAME }
  );
  console.log("Lambda active");
  return resp.FunctionArn!;
}

// ── 5. REST API + resources + methods ──────────────────────────────────────
async function createRestApi(functionArn: string): Promise<string> {
  // Check if API already exists
  const existing = await apigw.send(new GetRestApisCommand({ limit: 500 }));
  const found = (existing.items ?? []).find((a) => a.name === API_NAME);
  if (found?.id) {
    console.log(`REST API already exists: ${found.id}`);
    return found.id;
  }

  console.log(`Creating REST API: ${API_NAME}`);
  const api = await apigw.send(
    new CreateRestApiCommand({
      name: API_NAME,
      description: "aws-learning day 07 - REST API backed by Lambda proxy",
      // endpointConfiguration: REGIONAL is preferred (EDGE uses CloudFront)
      endpointConfiguration: { types: ["REGIONAL"] },
      tags: { project: "aws-learning", day: "07" },
    })
  );
  const apiId = api.id!;

  // Find the root "/" resource (created automatically with every REST API)
  const resources = await apigw.send(new GetResourcesCommand({ restApiId: apiId }));
  const rootResource = (resources.items ?? []).find((r) => r.path === "/");
  const rootId = rootResource!.id!;
  console.log(`Root resource ID: ${rootId}`);

  // Create {proxy+} resource — catches ALL paths under /
  const proxyResource = await apigw.send(
    new CreateResourceCommand({
      restApiId: apiId,
      parentId: rootId,
      pathPart: "{proxy+}", // greedy path variable
    })
  );
  const proxyId = proxyResource.id!;
  console.log(`Created {proxy+} resource: ${proxyId}`);

  // Lambda integration URI — always uses the /invocations path regardless of method
  const integrationUri = `arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${functionArn}/invocations`;

  // Helper: add ANY method + Lambda proxy integration to a resource
  async function addAnyMethod(resourceId: string, label: string): Promise<void> {
    // Method = the HTTP method API GW exposes to callers
    await apigw.send(
      new PutMethodCommand({
        restApiId: apiId,
        resourceId,
        httpMethod: "ANY",        // ANY = all HTTP verbs in one rule
        authorizationType: "NONE", // No auth for learning; use COGNITO/IAM in production
      })
    );
    // Integration = how API GW forwards to Lambda
    // AWS_PROXY = pass full request through; Lambda controls the response entirely
    // integrationHttpMethod MUST be "POST" for Lambda (Lambda invocations always POST)
    await apigw.send(
      new PutIntegrationCommand({
        restApiId: apiId,
        resourceId,
        httpMethod: "ANY",
        type: "AWS_PROXY",
        integrationHttpMethod: "POST",
        uri: integrationUri,
      })
    );
    console.log(`  Method + integration set on ${label}`);
  }

  await addAnyMethod(rootId, "/ (root)");
  await addAnyMethod(proxyId, "/{proxy+}");

  return apiId;
}

// ── 6. Lambda permission for API Gateway ───────────────────────────────────
async function addLambdaPermission(functionArn: string, apiId: string): Promise<void> {
  // Extract account ID from the function ARN (avoids needing STS call)
  // Format: arn:aws:lambda:{region}:{accountId}:function:{name}
  const accountId = functionArn.split(":")[4];
  const sourceArn = `arn:aws:execute-api:${REGION}:${accountId}:${apiId}/*`;

  await lambdaClient
    .send(
      new AddPermissionCommand({
        FunctionName: FUNCTION_NAME,
        StatementId: "allow-apigateway-day07",
        Action: "lambda:InvokeFunction",
        Principal: "apigateway.amazonaws.com",
        SourceArn: sourceArn,
      })
    )
    .catch((err) => {
      // Ignore if permission already exists (re-deploy scenario)
      if (err.name !== "ResourceConflictException") throw err;
      console.log("  Lambda permission already exists - skipping");
    });
  console.log(`Lambda permission added (sourceArn: ${sourceArn})`);
}

// ── 7. Deployment + stage ───────────────────────────────────────────────────
async function deployApi(apiId: string): Promise<void> {
  // A Deployment = a snapshot of your API configuration
  // A Stage = a named pointer to a Deployment (dev, prod, v1, etc.)
  // The invoke URL only works after you create a deployment + stage
  await apigw.send(
    new CreateDeploymentCommand({
      restApiId: apiId,
      stageName: STAGE_NAME,
      stageDescription: "aws-learning day 07 - dev stage",
      description: "Initial deployment",
    })
  );
  console.log(`Deployed to stage: ${STAGE_NAME}`);
}

async function main(): Promise<void> {
  console.log("=== Day 7 - Deploy API Gateway + Lambda ===\n");

  buildHandler();
  const zip = await createZip();
  const roleArn = await ensureIamRole();
  const functionArn = await deployLambda(zip, roleArn);
  const apiId = await createRestApi(functionArn);
  await addLambdaPermission(functionArn, apiId);
  await deployApi(apiId);

  const invokeUrl = `https://${apiId}.execute-api.${REGION}.amazonaws.com/${STAGE_NAME}`;

  console.log("\n=== API Gateway Ready ===");
  console.log(`  API ID:     ${apiId}`);
  console.log(`  Invoke URL: ${invokeUrl}`);
  console.log("\nTest routes:");
  console.log(`  GET  ${invokeUrl}/hello`);
  console.log(`  GET  ${invokeUrl}/hello?name=Alice`);
  console.log(`  POST ${invokeUrl}/echo`);
  console.log(`  GET  ${invokeUrl}/info`);
  console.log(`  GET  ${invokeUrl}/items/42`);
  console.log("\nNext: run 'npm run test' to call the live API");
}

main().catch(console.error);
