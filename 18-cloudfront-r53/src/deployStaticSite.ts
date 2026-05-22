import {
  S3Client,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";

import fs from "fs";
import path from "path";

const REGION = "ap-south-1";

const BUCKET_NAME =
  "day18-cloudfront-demo-bucket-12345";

const s3 = new S3Client({
  region: REGION
});

async function deployWebsite() {

  try {

    /*
      Create bucket
    */

    try {

      await s3.send(
        new CreateBucketCommand({
          Bucket: BUCKET_NAME
        })
      );

      console.log(
        "S3 bucket created"
      );

    } catch (error: any) {

      if (
        error.name ===
        "BucketAlreadyOwnedByYou"
      ) {

        console.log(
          "Bucket already exists, continuing..."
        );

      } else {
        throw error;
      }
    }

    /*
      Enable static hosting
    */

    await s3.send(
      new PutBucketWebsiteCommand({

        Bucket: BUCKET_NAME,

        WebsiteConfiguration: {

          IndexDocument: {
            Suffix: "index.html"
          }
        }
      })
    );

    console.log(
      "Static website hosting enabled"
    );

    /*
      Upload files
    */

    const websitePath =
      path.join(__dirname, "../website");

    const files = [
      "index.html",
      "styles.css",
      "app.js"
    ];

    for (const file of files) {

      const filePath =
        path.join(websitePath, file);

      await s3.send(
        new PutObjectCommand({

          Bucket: BUCKET_NAME,

          Key: file,

          Body: fs.readFileSync(filePath),

          ContentType:
            file.endsWith(".html")
              ? "text/html"
              : file.endsWith(".css")
              ? "text/css"
              : "application/javascript"
        })
      );

      console.log(
        `${file} uploaded`
      );
    }

    /*
      Final URL
    */

    console.log(`
Website URL:
http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com
`);

  } catch (error) {

    console.error(error);
  }
}

deployWebsite();