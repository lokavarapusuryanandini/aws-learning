/**
 * LAMBDA HANDLER — this file is compiled to JS and deployed to AWS Lambda.
 * It must be self-contained: no imports from other local files (client.ts etc.)
 * because the deployment ZIP only contains this compiled file.
 *
 * Concepts:
 *   - handler = the entry point Lambda calls; export name must match Handler config
 *   - event   = the JSON payload passed by the caller (or trigger service)
 *   - context = runtime info: requestId, remaining time, function name, etc.
 *   - console.log() automatically goes to CloudWatch Logs
 *   - return value is returned to the caller (synchronous invocation)
 *   - throwing an Error marks the invocation as failed
 */

import { Context } from "aws-lambda";

interface LambdaEvent {
  action?: string;
  input?: string;
  [key: string]: unknown;
}

export const handler = async (
  event: LambdaEvent,
  context: Context
): Promise<object> => {
  // Every console.log line becomes a CloudWatch log event
  console.log("Event:", JSON.stringify(event, null, 2));
  console.log("Request ID:", context.awsRequestId);
  console.log("Remaining time (ms):", context.getRemainingTimeInMillis());
  console.log("Memory limit (MB):", context.memoryLimitInMB);

  const action = event.action ?? "echo";
  const input = (event.input as string) ?? "";

  switch (action) {
    // --- echo: return the input as-is ---
    case "echo":
      return {
        action,
        result: input || "no input provided",
        requestId: context.awsRequestId,
      };

    // --- reverse: reverse the characters of input ---
    case "reverse":
      return {
        action,
        input,
        result: input.split("").reverse().join(""),
      };

    // --- upper: uppercase the input ---
    case "upper":
      return {
        action,
        input,
        result: input.toUpperCase(),
      };

    // --- env: read environment variables injected at deploy time ---
    case "env":
      return {
        action,
        result: {
          // Custom env vars set when the function was created
          DAY: process.env.DAY,
          STAGE: process.env.STAGE,
          // Built-in Lambda env vars (always present)
          AWS_REGION: process.env.AWS_REGION,
          FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
          FUNCTION_VERSION: process.env.AWS_LAMBDA_FUNCTION_VERSION,
          LOG_GROUP: process.env.AWS_LAMBDA_LOG_GROUP_NAME,
        },
      };

    // --- throw: demonstrate what a Lambda error looks like ---
    case "throw":
      // Lambda catches this, marks the invocation as FAILED,
      // writes the error + stack trace to CloudWatch, and
      // returns an error object to the caller
      throw new Error("Intentional error for testing Lambda error handling");

    default:
      return {
        action: "unknown",
        error: `Unknown action: "${action}"`,
        availableActions: ["echo", "reverse", "upper", "env", "throw"],
      };
  }
};
