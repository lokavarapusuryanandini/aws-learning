import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day17";

const eb = new EventBridgeClient({ region: REGION });

const BUS_NAME = `${PREFIX}-bus`;

async function publishEvent() {
  const res = await eb.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: "aws-learning.orders",
          DetailType: "OrderCreated",
          EventBusName: BUS_NAME,
          Detail: JSON.stringify({
            orderId: "123",
            amount: 500,
            status: "CREATED",
          }),
        },
      ],
    })
  );

  console.log("Event Published:", JSON.stringify(res, null, 2));
}

publishEvent().catch(console.error);