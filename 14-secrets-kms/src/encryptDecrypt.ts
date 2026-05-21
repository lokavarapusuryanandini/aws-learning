import {
  KMSClient,
  CreateKeyCommand,
  EncryptCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";

const client = new KMSClient({
  region: "us-east-1",
});

async function encryptDecrypt() {
  const key = await client.send(
    new CreateKeyCommand({
      Description: "Day14 learning key",
    })
  );

  const keyId = key.KeyMetadata?.KeyId;

  console.log("KMS Key Created:");
  console.log(keyId);

  const text = "Hello AWS KMS";

  const encrypted = await client.send(
    new EncryptCommand({
      KeyId: keyId,
      Plaintext: Buffer.from(text),
    })
  );

  console.log("\nEncrypted text generated");

  const decrypted = await client.send(
    new DecryptCommand({
      CiphertextBlob: encrypted.CiphertextBlob,
    })
  );

  const decryptedText = Buffer.from(
    decrypted.Plaintext as Uint8Array
  ).toString();

  console.log("\nDecrypted text:");
  console.log(decryptedText);
}

encryptDecrypt().catch(console.error);