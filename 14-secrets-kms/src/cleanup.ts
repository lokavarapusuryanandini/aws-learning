import {
  SecretsManagerClient,
  DeleteSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

async function cleanup() {
  await client.send(
    new DeleteSecretCommand({
      SecretId: "aws-learning-day14-secret",

      ForceDeleteWithoutRecovery: true,
    })
  );

  console.log("Secret deleted successfully");
}

cleanup().catch(console.error);