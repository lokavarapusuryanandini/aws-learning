import { IAMClient } from "@aws-sdk/client-iam";

// AWS SDK v3 picks up credentials automatically from:
//   1. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
//   2. ~/.aws/credentials file (aws configure)
//   3. IAM role attached to EC2/Lambda (in production)
export const iamClient = new IAMClient({ region: "us-east-1" });

// IAM is a global service but SDK still needs a region set
export const LEARNING_PREFIX = "aws-learning"; // tag all resources so we can clean up easily
