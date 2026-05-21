import {
  SecretsManagerClient,
  PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

async function rotateSecret() {
  const command = new PutSecretValueCommand({
    SecretId: "aws-learning-day14-secret",

    SecretString: JSON.stringify({
      username: "nandini",
      password: "new-rotated-password",
    }),
  });

  const response = await client.send(command);

  console.log("Secret rotated successfully");
  console.log(response.VersionId);
}

rotateSecret().catch(console.error);