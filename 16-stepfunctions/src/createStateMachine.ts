import {
  SFNClient,
  CreateStateMachineCommand,
} from "@aws-sdk/client-sfn";

import {
  IAMClient,
  CreateRoleCommand,
  AttachRolePolicyCommand,
  GetRoleCommand,
} from "@aws-sdk/client-iam";
import fs from "fs";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day16";

const sfn = new SFNClient({ region: REGION });
const iam = new IAMClient({ region: REGION });

const ROLE_NAME = `${PREFIX}-role`;

async function createRole() {
  try {
    await iam.send(new GetRoleCommand({ RoleName: ROLE_NAME }));
    console.log("Role already exists");
  } catch {
    const role = await iam.send(
      new CreateRoleCommand({
        RoleName: ROLE_NAME,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "states.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        }),
      })
    );

    const roleArn = role.Role?.Arn!;

    await iam.send(
      new AttachRolePolicyCommand({
        RoleName: ROLE_NAME,
        PolicyArn: "arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess",
})
    );

    console.log("Role created:", roleArn);
  }
}

async function createStateMachine() {
  const definition = {
    Comment: "Day 16 Step Functions Workflow",
    StartAt: "Validate",
    States: {
      Validate: {
        Type: "Pass",
        Result: { valid: true },
        Next: "Process"
      },
      Process: {
        Type: "Pass",
        Result: { status: "processed" },
        Next: "ParallelStep"
      },
      ParallelStep: {
        Type: "Parallel",
        Branches: [
          {
            StartAt: "Notify",
            States: {
              Notify: {
                Type: "Pass",
                Result: "User Notified",
                End: true
              }
            }
          },
          {
            StartAt: "Analytics",
            States: {
              Analytics: {
                Type: "Pass",
                Result: "Analytics Stored",
                End: true
              }
            }
          }
        ],
        Next: "Success"
      },
      Success: {
        Type: "Succeed"
      }
    }
  };

  const roleArn = (await iam.send(new GetRoleCommand({ RoleName: ROLE_NAME }))).Role!.Arn!;

  const res = await sfn.send(
    new CreateStateMachineCommand({
      name: `${PREFIX}-workflow`,
      roleArn,
      definition: JSON.stringify(definition)
    })
  );

fs.writeFileSync("sm-arn.txt", res.stateMachineArn!);
  console.log("State Machine Created:", res.stateMachineArn);
}

async function main() {
  await createRole();
  await createStateMachine();
}

main().catch(console.error);