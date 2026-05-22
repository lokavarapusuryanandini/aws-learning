import {
  CloudFrontClient,
  CreateInvalidationCommand
} from "@aws-sdk/client-cloudfront";

const client = new CloudFrontClient({
  region: "us-east-1"
});

const DISTRIBUTION_ID =
  "E3U5PMBSI135C6";

async function invalidateCache() {

  try {

    const response = await client.send(
      new CreateInvalidationCommand({

        DistributionId:
          DISTRIBUTION_ID,

        InvalidationBatch: {

          CallerReference:
            `${Date.now()}`,

          Paths: {
            Quantity: 1,

            Items: [
              "/*"
            ]
          }
        }
      })
    );

    console.log(
      "Invalidation Created"
    );

    console.log(
      response.Invalidation?.Id
    );

  } catch (error) {
    console.error(error);
  }
}

invalidateCache();