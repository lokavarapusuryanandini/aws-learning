import {
  GetAuthorizationTokenCommand,
  ECRClient,
} from "@aws-sdk/client-ecr";

import { execSync } from "child_process";

const REGION = "us-east-1";
const ACCOUNT_ID = "042744890862";

const REPOSITORY_NAME = "aws-learning-day13";

const IMAGE_URI =
  `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPOSITORY_NAME}`;

const ecr = new ECRClient({
  region: REGION,
});

async function pushImage(): Promise<void> {
  // Get ECR login token
  const auth = await ecr.send(
    new GetAuthorizationTokenCommand({})
  );

  const authData = auth.authorizationData?.[0];

  if (!authData?.authorizationToken || !authData.proxyEndpoint) {
    throw new Error("Unable to get ECR auth token");
  }

  const decoded = Buffer.from(
    authData.authorizationToken,
    "base64"
  ).toString("utf-8");

  const password = decoded.split(":")[1];

  console.log("Logging into ECR...");

  execSync(
    `docker login --username AWS --password ${password} ${authData.proxyEndpoint}`,
    {
      stdio: "inherit",
    }
  );

  console.log("\nTagging image...");

  execSync(
    `docker tag aws-learning-day13:latest ${IMAGE_URI}:latest`,
    {
      stdio: "inherit",
    }
  );

  console.log("\nPushing image to ECR...");

  execSync(
    `docker push ${IMAGE_URI}:latest`,
    {
      stdio: "inherit",
    }
  );

  console.log("\nImage pushed successfully");
  console.log(`Image URI: ${IMAGE_URI}:latest`);
}

pushImage().catch(console.error);