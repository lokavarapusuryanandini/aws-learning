/**
 * DAY 13 - Create ECR Repository
 *
 * Concepts:
 *  - ECR repository stores Docker images
 *  - Image scanning helps detect vulnerabilities
 *  - Repository URI is used for docker push/pull
 */

import {
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr";

import {
  ecr,
  REPOSITORY_NAME,
} from "./client";

async function repositoryExists(): Promise<boolean> {
  try {
    const response = await ecr.send(
      new DescribeRepositoriesCommand({
        repositoryNames: [REPOSITORY_NAME],
      })
    );

    return !!response.repositories?.length;
  } catch {
    return false;
  }
}

async function createRepository(): Promise<void> {
  const exists = await repositoryExists();

  if (exists) {
    console.log(`Repository '${REPOSITORY_NAME}' already exists`);
    return;
  }

  console.log(`Creating repository: ${REPOSITORY_NAME}`);

  const response = await ecr.send(
    new CreateRepositoryCommand({
      repositoryName: REPOSITORY_NAME,

      imageScanningConfiguration: {
        scanOnPush: true,
      },

      imageTagMutability: "MUTABLE",
    })
  );

  const repository = response.repository;

  console.log("\n=== Repository Created ===");

  console.log(`Name: ${repository?.repositoryName}`);

  console.log(`URI: ${repository?.repositoryUri}`);

  console.log(`ARN: ${repository?.repositoryArn}`);
}

async function main(): Promise<void> {
  console.log("=== Day 13 - Create ECR Repository ===\n");

  await createRepository();
}

main().catch(console.error);