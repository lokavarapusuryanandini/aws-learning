/**
 * DAY 6 - Task 2: Invoke a Lambda function
 *
 * Concepts:
 *   - InvocationType "RequestResponse" = synchronous; wait for the result (default)
 *   - InvocationType "Event"           = asynchronous; Lambda queues it and returns 202 immediately
 *   - InvocationType "DryRun"          = validate permissions without executing
 *   - Payload = the event body (JSON encoded as Uint8Array)
 *   - Response Payload = base64-decoded JSON body returned by the function
 *   - FunctionError = "Handled" (function threw) or "Unhandled" (runtime crash)
 *   - StatusCode 200 = function executed (even if it threw a handled error)
 *   - StatusCode 202 = async invocation accepted
 */

import { InvokeCommand } from "@aws-sdk/client-lambda";
import { lambda, FUNCTION_NAME } from "./client";

interface InvokeResult {
  statusCode: number;
  functionError?: string;
  payload: unknown;
}

async function invoke(
  label: string,
  event: Record<string, unknown>
): Promise<InvokeResult> {
  const resp = await lambda.send(
    new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      InvocationType: "RequestResponse",
      // Payload must be a JSON string encoded as Uint8Array
      Payload: new TextEncoder().encode(JSON.stringify(event)),
      // LogType "Tail" returns the last 4 KB of logs in the response (base64)
      LogType: "Tail",
    })
  );

  // Decode the response payload (Uint8Array → string → JSON)
  const raw = new TextDecoder().decode(resp.Payload);
  const payload = raw ? JSON.parse(raw) : null;

  console.log(`\n--- ${label} ---`);
  console.log(`  Status: ${resp.StatusCode}`);
  if (resp.FunctionError) {
    console.log(`  Function error: ${resp.FunctionError}`);
  }
  console.log(`  Payload: ${JSON.stringify(payload, null, 2)}`);

  return {
    statusCode: resp.StatusCode ?? 0,
    functionError: resp.FunctionError,
    payload,
  };
}

async function main(): Promise<void> {
  console.log(`=== Day 6 - Invoke Lambda: ${FUNCTION_NAME} ===\n`);

  // 1. Echo — return input unchanged
  await invoke("echo action", { action: "echo", input: "hello from AWS Lambda!" });

  // 2. Reverse — reverse the characters of input
  await invoke("reverse action", { action: "reverse", input: "Lambda is cool" });

  // 3. Upper — uppercase the input
  await invoke("upper action", { action: "upper", input: "learning aws sdk v3" });

  // 4. Env — read environment variables set at deploy time + built-in Lambda vars
  await invoke("env action", { action: "env" });

  // 5. Unknown action — shows the graceful default branch
  await invoke("unknown action", { action: "fly" });

  // 6. Throw — function throws; statusCode is still 200 but FunctionError is set
  //    The payload contains { errorMessage, errorType, stackTrace }
  await invoke("throw action (handled error)", { action: "throw" });

  console.log("\n=== All invocations complete ===");
  console.log("Next: run 'npm run logs' to view the CloudWatch log output");
}

main().catch(console.error);
