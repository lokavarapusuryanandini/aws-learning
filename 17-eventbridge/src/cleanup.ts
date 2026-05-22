import { EventBridgeClient, DeleteRuleCommand, RemoveTargetsCommand, DeleteEventBusCommand } from "@aws-sdk/client-eventbridge";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day17";

const eb = new EventBridgeClient({ region: REGION });

const BUS_NAME = `${PREFIX}-bus`;
const RULE_NAME = `${PREFIX}-rule`;

async function cleanup() {
  try {
    // 1. Remove targets (none added, but safe)
    await eb.send(
      new RemoveTargetsCommand({
        Rule: RULE_NAME,
        EventBusName: BUS_NAME,
        Ids: ["1"],
      })
    ).catch(() => {});

    // 2. Delete rule
    await eb.send(
      new DeleteRuleCommand({
        Name: RULE_NAME,
        EventBusName: BUS_NAME,
      })
    );

    console.log("Rule deleted");

    // 3. Delete event bus
    await eb.send(
      new DeleteEventBusCommand({
        Name: BUS_NAME,
      })
    );

    console.log("Event Bus deleted");
  } catch (err) {
    console.error(err);
  }
}

cleanup();