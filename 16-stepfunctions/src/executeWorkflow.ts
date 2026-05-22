import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from "@aws-sdk/client-sfn";

const REGION = "us-east-1";
const PREFIX = "aws-learning-day16";
import fs from "fs";

const STATE_MACHINE_ARN = fs.readFileSync("sm-arn.txt", "utf-8");
const sfn = new SFNClient({ region: REGION });

// const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function execute() {
  const start = await sfn.send(
    new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      input: JSON.stringify({
        orderId: "123",
        amount: 250
      })
    })
  );

  const executionArn = start.executionArn!;
  console.log("Execution started:", executionArn);

  let status = "RUNNING";

  while (status === "RUNNING") {
    await sleep(2000);

    const res = await sfn.send(
      new DescribeExecutionCommand({
        executionArn
      })
    );

    status = res.status!;
    console.log("Status:", status);

    if (status !== "RUNNING") {
      console.log("Output:", res.output);
    }
  }
}

execute().catch(console.error);