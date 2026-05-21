import {
  ECSClient,
  ListClustersCommand,
  ListTaskDefinitionsCommand,
  ListTasksCommand,
} from "@aws-sdk/client-ecs";

import {
  ECRClient,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr";

const REGION = "us-east-1";

const ecs = new ECSClient({
  region: REGION,
});

const ecr = new ECRClient({
  region: REGION,
});

const CLUSTER_NAME = "aws-learning-day13-cluster";

async function listResources(): Promise<void> {
  console.log("=== ECS Clusters ===\n");

  const clusters = await ecs.send(
    new ListClustersCommand({})
  );

  console.log(clusters.clusterArns);

  console.log("\n=== ECS Task Definitions ===\n");

  const taskDefinitions = await ecs.send(
    new ListTaskDefinitionsCommand({})
  );

  console.log(taskDefinitions.taskDefinitionArns);

  console.log("\n=== ECS Tasks ===\n");

  const tasks = await ecs.send(
    new ListTasksCommand({
      cluster: CLUSTER_NAME,
    })
  );

  console.log(tasks.taskArns);

  console.log("\n=== ECR Repositories ===\n");

  const repositories = await ecr.send(
    new DescribeRepositoriesCommand({})
  );

  for (const repo of repositories.repositories ?? []) {
    console.log(repo.repositoryUri);
  }
}

listResources().catch(console.error);