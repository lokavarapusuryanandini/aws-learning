import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { IAMClient } from "@aws-sdk/client-iam";

export const apigw = new APIGatewayClient({ region: "us-east-1" });
export const lambdaClient = new LambdaClient({ region: "us-east-1" });
export const iam = new IAMClient({ region: "us-east-1" });

export const REGION = "us-east-1";
export const API_NAME = "aws-learning-day07";
export const FUNCTION_NAME = "aws-learning-day07";
export const ROLE_NAME = "aws-learning-day07-lambda-role";
export const STAGE_NAME = "dev";
export const BASIC_EXECUTION_POLICY =
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole";
