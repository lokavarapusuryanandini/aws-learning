/**
 * CDK App entry point
 *
 * An App is the root of the CDK construct tree.
 * Each Stack maps 1:1 to a CloudFormation stack.
 * You can have multiple stacks in one app (e.g. per environment or per region).
 *
 * Run order:
 *   npm run synth   → generate CloudFormation template (see cdk.out/)
 *   npm run diff    → show what will change vs what's deployed
 *   npm run deploy  → deploy the stack to AWS
 *   npm run destroy → delete all stack resources
 */

import * as cdk from "aws-cdk-lib";
import { Day12Stack } from "../lib/day12-stack";

const app = new cdk.App();

new Day12Stack(app, "aws-learning-day12", {
  env: {
    region: "us-east-1",
    // account: process.env.CDK_DEFAULT_ACCOUNT, // uncomment to use your default account
  },
  description: "aws-learning Day 12 - CDK stack (S3 + Lambda + Function URL)",
  tags: {
    project: "aws-learning",
    day: "12",
  },
});
