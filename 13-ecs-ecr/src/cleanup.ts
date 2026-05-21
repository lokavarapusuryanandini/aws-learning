import {
  ECSClient,
  ListTasksCommand,
  StopTaskCommand,
  DeleteClusterCommand,
} from "@aws-sdk/client-ecs";

import {
  ECRClient,
  DeleteRepositoryCommand,
} from "@aws-sdk/client-ecr";

const REGION = "us-east-1";

const ecs = new ECSClient({
  region: REGION,
});

const ecr = new ECRClient({
  region: REGION,
});

const CLUSTER_NAME = "aws-learning-day13-cluster";

const REPOSITORY_NAME = "aws-learning-day13";

async function cleanup(): Promise<void> {
  console.log("Finding running ECS tasks...\n");

  const tasks = await ecs.send(
    new ListTasksCommand({
      cluster: CLUSTER_NAME,
    })
  );

  const taskArns = tasks.taskArns ?? [];

  if (taskArns.length > 0) {
    for (const taskArn of taskArns) {
      console.log(`Stopping task:\n${taskArn}\n`);

      await ecs.send(
        new StopTaskCommand({
          cluster: CLUSTER_NAME,
          task: taskArn,
          reason: "Cleanup resources",
        })
      );
    }
  } else {
    console.log("No running tasks found\n");
  }

  console.log("Deleting ECS cluster...\n");

  try {
    await ecs.send(
      new DeleteClusterCommand({
        cluster: CLUSTER_NAME,
      })
    );

    console.log("ECS cluster deleted\n");
  } catch (error) {
    console.log("Cluster delete failed");
    console.log(error);
  }

  console.log("Deleting ECR repository...\n");

  try {
    await ecr.send(
      new DeleteRepositoryCommand({
        repositoryName: REPOSITORY_NAME,

        // deletes all images also
        force: true,
      })
    );

    console.log("ECR repository deleted\n");
  } catch (error) {
    console.log("ECR delete failed");
    console.log(error);
  }

  console.log("Cleanup complete");
}

cleanup().catch(console.error);