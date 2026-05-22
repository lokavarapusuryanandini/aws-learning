import {
  SFNClient,
  DeleteStateMachineCommand,
  ListStateMachinesCommand,
} from "@aws-sdk/client-sfn";

import {
  IAMClient,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  ListAttachedRolePoliciesCommand,
} from "@aws-sdk/client-iam";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day16";

const sfn = new SFNClient({ region: REGION });
const iam = new IAMClient({ region: REGION });

const ROLE_NAME = `${PREFIX}-role`;

async function deleteStateMachine() {
  const list = await sfn.send(new ListStateMachinesCommand({}));

  const sm = list.stateMachines?.find((s) =>
    s.name?.includes(PREFIX)
  );

  if (!sm?.stateMachineArn) return;

  await sfn.send(
    new DeleteStateMachineCommand({
      stateMachineArn: sm.stateMachineArn,
    })
  );

  console.log("Deleted State Machine");
}

async function deleteRole() {
  const attached = await iam.send(
    new ListAttachedRolePoliciesCommand({
      RoleName: ROLE_NAME,
    })
  );

  for (const p of attached.AttachedPolicies || []) {
    await iam.send(
      new DetachRolePolicyCommand({
        RoleName: ROLE_NAME,
        PolicyArn: p.PolicyArn!,
      })
    );
  }

  await iam.send(
    new DeleteRoleCommand({
      RoleName: ROLE_NAME,
    })
  );

  console.log("Deleted IAM Role");
}

async function main() {
  await deleteStateMachine();
  await deleteRole();
}

main().catch(console.error);