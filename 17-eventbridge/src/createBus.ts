import { EventBridgeClient, CreateEventBusCommand, PutRuleCommand, PutTargetsCommand } from "@aws-sdk/client-eventbridge";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day17";

const eb = new EventBridgeClient({ region: REGION });

const BUS_NAME = `${PREFIX}-bus`;
const RULE_NAME = `${PREFIX}-rule`;

async function createBusAndRule() {
  try {
    // 1. Create Event Bus
    await eb.send(
      new CreateEventBusCommand({
        Name: BUS_NAME,
      })
    );
    console.log("Event Bus Created:", BUS_NAME);
  } catch (err: any) {
    if (err.name !== "ResourceAlreadyExistsException") {
      throw err;
    }
    console.log("Event Bus already exists");
  }

  // 2. Create Rule
  const rule = await eb.send(
    new PutRuleCommand({
      Name: RULE_NAME,
      EventBusName: BUS_NAME,
      EventPattern: JSON.stringify({
        source: ["aws-learning.orders"],
        "detail-type": ["OrderCreated"],
      }),
    })
  );

  console.log("Rule Created:", rule.RuleArn);

  // 3. NOTE: No real Lambda target here yet (for simplicity)
  // We will just print matching events in publish step
}

createBusAndRule().catch(console.error);