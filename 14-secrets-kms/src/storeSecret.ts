import {
  SecretsManagerClient,
  CreateSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

async function storeSecret() {
  const command = new CreateSecretCommand({
    Name: "aws-learning-day14-secret",
    SecretString: JSON.stringify({
      username: "nandini",
      password: "super-secret-password",
    }),
  });

  const response = await client.send(command);

  console.log("Secret created successfully");
  console.log(response.ARN);
}

storeSecret().catch(console.error);