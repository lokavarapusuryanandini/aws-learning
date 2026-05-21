import {
  CreateClusterCommand,
  DescribeClustersCommand,
  ECSClient,
} from "@aws-sdk/client-ecs";

const ecs = new ECSClient({
  region: "us-east-1",
});

const CLUSTER_NAME = "aws-learning-day13-cluster";

async function createCluster(): Promise<void> {
  // Check if cluster already exists
  const existing = await ecs.send(
    new DescribeClustersCommand({
      clusters: [CLUSTER_NAME],
    })
  );

  if (existing.clusters?.length) {
    console.log("Cluster already exists");
    console.log(existing.clusters[0].clusterArn);
    return;
  }

  const response = await ecs.send(
    new CreateClusterCommand({
      clusterName: CLUSTER_NAME,

      tags: [
        {
          key: "project",
          value: "aws-learning",
        },
        {
          key: "day",
          value: "13",
        },
      ],
    })
  );

  console.log("Cluster created successfully\n");

  console.log("Cluster ARN:");
  console.log(response.cluster?.clusterArn);
}

createCluster().catch(console.error);