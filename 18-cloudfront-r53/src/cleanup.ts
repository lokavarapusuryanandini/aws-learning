import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand
} from "@aws-sdk/client-s3";

import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand
} from "@aws-sdk/client-cloudfront";

const REGION = "ap-south-1";

const BUCKET_NAME =
  "day18-cloudfront-demo-bucket-12345";

const DISTRIBUTION_ID =
  "E3U5PMBSI135C6";

const s3 = new S3Client({
  region: REGION
});

const cloudfront = new CloudFrontClient({
  region: "us-east-1"
});

async function cleanup() {

  try {

    /*
      STEP 1
      Delete S3 objects
    */

    try {

      const objects = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME
        })
      );

      if (objects.Contents?.length) {

        await s3.send(
          new DeleteObjectsCommand({

            Bucket: BUCKET_NAME,

            Delete: {
              Objects:
                objects.Contents.map(
                  (item) => ({
                    Key: item.Key
                  })
                )
            }
          })
        );

        console.log(
          "S3 bucket objects deleted"
        );

      } else {

        console.log(
          "Bucket already empty"
        );
      }

    } catch (error: any) {

      if (
        error.name === "NoSuchBucket"
      ) {

        console.log(
          "Bucket does not exist, skipping..."
        );

      } else {
        throw error;
      }
    }

    /*
      STEP 2
      Delete bucket
    */

    try {

      await s3.send(
        new DeleteBucketCommand({
          Bucket: BUCKET_NAME
        })
      );

      console.log(
        "S3 bucket deleted"
      );

    } catch (error: any) {

      if (
        error.name === "NoSuchBucket"
      ) {

        console.log(
          "Bucket already deleted"
        );

      } else {
        throw error;
      }
    }

    /*
      STEP 3
      Disable CloudFront distribution
    */

    try {

      const distributionConfig =
        await cloudfront.send(
          new GetDistributionConfigCommand({
            Id: DISTRIBUTION_ID
          })
        );

      if (
        distributionConfig.DistributionConfig &&
        distributionConfig.ETag
      ) {

        distributionConfig
          .DistributionConfig
          .Enabled = false;

        await cloudfront.send(
          new UpdateDistributionCommand({

            Id: DISTRIBUTION_ID,

            IfMatch:
              distributionConfig.ETag,

            DistributionConfig:
              distributionConfig.DistributionConfig
          })
        );

        console.log(
          "CloudFront distribution disabled"
        );
      }

      console.log(
        "Wait a few minutes before deleting distribution"
      );

    } catch (error: any) {

      if (
        error.name ===
        "NoSuchDistribution"
      ) {

        console.log(
          "Distribution does not exist, skipping..."
        );

      } else {
        throw error;
      }
    }

    /*
      STEP 4
      Delete CloudFront distribution
    */

    try {

      const latestConfig =
        await cloudfront.send(
          new GetDistributionConfigCommand({
            Id: DISTRIBUTION_ID
          })
        );

      if (
        latestConfig.ETag &&
        latestConfig.DistributionConfig
      ) {

        await cloudfront.send(
          new DeleteDistributionCommand({

            Id: DISTRIBUTION_ID,

            IfMatch:
              latestConfig.ETag
          })
        );

        console.log(
          "CloudFront distribution deleted"
        );
      }

    } catch (error: any) {

      if (
        error.name ===
        "NoSuchDistribution"
      ) {

        console.log(
          "Distribution already deleted"
        );

      } else {

        console.error(error);
      }
    }

  } catch (error) {

    console.error(error);
  }
}

cleanup();


// import {
//   CloudFrontClient,
//   GetDistributionCommand,
//   UpdateDistributionCommand,
//   DeleteDistributionCommand,
// } from "@aws-sdk/client-cloudfront";

// const cf = new CloudFrontClient({ region: "us-east-1" });

// export const cleanupCloudFront = async (distributionId: string) => {
//   // 1. Get current config + ETag
//   const dist = await cf.send(
//     new GetDistributionCommand({ Id: distributionId })
//   );

//   const etag = dist.ETag!;
//   const config = dist.Distribution?.DistributionConfig!;

//   // 2. Disable distribution
//   await cf.send(
//     new UpdateDistributionCommand({
//       Id: distributionId,
//       IfMatch: etag,
//       DistributionConfig: {
//         ...config,
//         Enabled: false,
//       },
//     })
//   );

//   console.log("Disabled distribution. Waiting...");

//   // ⚠️ In real AWS, wait 5–10 minutes here
//   await new Promise((r) => setTimeout(r, 60000));

//   // 3. Get fresh ETag after disable
//   const updated = await cf.send(
//     new GetDistributionCommand({ Id: distributionId })
//   );

//   // 4. Delete distribution
//   await cf.send(
//     new DeleteDistributionCommand({
//       Id: distributionId,
//       IfMatch: updated.ETag!,
//     })
//   );

//   console.log("CloudFront distribution deleted");
// };