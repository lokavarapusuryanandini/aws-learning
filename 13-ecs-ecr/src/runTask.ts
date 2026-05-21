import {
  ECSClient,
  RegisterTaskDefinitionCommand,
  RunTaskCommand,
} from "@aws-sdk/client-ecs";

const ecs = new ECSClient({
  region: "us-east-1",
});

const ACCOUNT_ID = "042744890862";
const REGION = "us-east-1";

const CLUSTER_NAME = "aws-learning-day13-cluster";

const IMAGE_URI =
  `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/aws-learning-day13:latest`;

// Default ECS Task Execution Role
const EXECUTION_ROLE_ARN =
  `arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole`;

async function runTask(): Promise<void> {
  console.log("Registering task definition...\n");

  const taskDef = await ecs.send(
    new RegisterTaskDefinitionCommand({
      family: "aws-learning-day13-task",

      networkMode: "awsvpc",

      requiresCompatibilities: ["FARGATE"],

      cpu: "256",
      memory: "512",

      // IMPORTANT FOR FARGATE + ECR
      executionRoleArn: EXECUTION_ROLE_ARN,

      containerDefinitions: [
        {
          name: "aws-learning-container",

          image: IMAGE_URI,

          essential: true,

          portMappings: [
            {
              containerPort: 3000,
              protocol: "tcp",
            },
          ],
        },
      ],
    })
  );

  const taskDefinitionArn =
    taskDef.taskDefinition?.taskDefinitionArn;

  console.log("Task definition registered");
  console.log(taskDefinitionArn);

  console.log("\nRunning ECS task...\n");

  const task = await ecs.send(
    new RunTaskCommand({
      cluster: CLUSTER_NAME,

      launchType: "FARGATE",

      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",

          subnets: [
            "subnet-02cf24c4e290000ad",
          ],
        },
      },

      taskDefinition: taskDefinitionArn,

      count: 1,
    })
  );

  console.log("Task started successfully\n");

  console.log(task.tasks?.[0]?.taskArn);
}

runTask().catch(console.error);