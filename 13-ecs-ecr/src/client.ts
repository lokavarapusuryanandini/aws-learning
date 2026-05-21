/**
 * DAY 13 - ECS + ECR
 *
 * Concepts:
 *  - ECR = Elastic Container Registry
 *      AWS-managed Docker image registry
 *
 *  - ECS = Elastic Container Service
 *      Container orchestration service
 *
 *  - Cluster
 *      Logical group of ECS resources/tasks
 *
 *  - Task Definition
 *      Blueprint describing container configuration
 *
 *  - Task
 *      Running container instance
 *
 *  - Fargate
 *      Serverless compute engine for containers
 *
 *  - Repository
 *      Stores Docker container images
 */

import { ECSClient } from "@aws-sdk/client-ecs";
import { ECRClient } from "@aws-sdk/client-ecr";

export const REGION = "us-east-1";

/**
 * ECS Client
 */
export const ecs = new ECSClient({
  region: REGION,
});

/**
 * ECR Client
 */
export const ecr = new ECRClient({
  region: REGION,
});

/**
 * Constants
 */
export const REPOSITORY_NAME = "aws-learning-day13";

export const CLUSTER_NAME = "aws-learning-day13-cluster";

export const TASK_FAMILY = "aws-learning-day13-task";