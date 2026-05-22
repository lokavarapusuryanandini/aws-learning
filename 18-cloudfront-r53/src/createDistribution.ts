import {
  CloudFrontClient,
  CreateDistributionCommand
} from "@aws-sdk/client-cloudfront";

const client = new CloudFrontClient({
  region: "us-east-1"
});

const BUCKET_DOMAIN =
  "day18-cloudfront-demo-bucket-12345.s3-website-ap-south-1.amazonaws.com";

async function createDistribution() {

  try {

    const response = await client.send(
      new CreateDistributionCommand({

        DistributionConfig: {

          CallerReference: `${Date.now()}`,

          Enabled: true,

          Origins: {
            Quantity: 1,

            Items: [
              {
                Id: "S3Origin",

                DomainName: BUCKET_DOMAIN,

                CustomOriginConfig: {
                  HTTPPort: 80,
                  HTTPSPort: 443,
                  OriginProtocolPolicy: "http-only"
                }
              }
            ]
          },

          DefaultCacheBehavior: {
            TargetOriginId: "S3Origin",

            ViewerProtocolPolicy:
              "redirect-to-https",

            TrustedSigners: {
              Enabled: false,
              Quantity: 0
            },

            ForwardedValues: {
              QueryString: false,

              Cookies: {
                Forward: "none"
              }
            },

            MinTTL: 0
          },

          Comment:
            "Day 18 CloudFront Distribution",

          DefaultRootObject:
            "index.html"
        }
      })
    );

    console.log(
      "CloudFront URL:"
    );

    console.log(
      response.Distribution?.DomainName
    );

  } catch (error) {
    console.error(error);
  }
}

createDistribution();