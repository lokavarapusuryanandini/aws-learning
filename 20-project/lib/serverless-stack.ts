import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

import * as lambda from
  "aws-cdk-lib/aws-lambda";

import * as apigateway from
  "aws-cdk-lib/aws-apigateway";

import * as s3 from
  "aws-cdk-lib/aws-s3";

export class ServerlessStack
  extends cdk.Stack {

  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps
  ) {

    super(scope, id, props);

    /*
      S3 Bucket
    */

    const bucket =
      new s3.Bucket(this, "ProjectBucket", {

        removalPolicy:
          cdk.RemovalPolicy.DESTROY,

        autoDeleteObjects: true
      });

    /*
      Lambda Function
    */

    const helloFunction =
      new lambda.Function(
        this,
        "HelloFunction",
        {

          runtime:
            lambda.Runtime.NODEJS_20_X,

          handler: "hello.handler",

          code:
            lambda.Code.fromAsset(
              "lambda"
            ),

          environment: {
            BUCKET_NAME:
              bucket.bucketName
          }
        }
      );

    /*
      Grant permissions
    */

    bucket.grantReadWrite(
      helloFunction
    );

    /*
      API Gateway
    */

    const api =
      new apigateway.LambdaRestApi(
        this,
        "ServerlessApi",
        {
          handler:
            helloFunction
        }
      );

    /*
      Outputs
    */

    new cdk.CfnOutput(
      this,
      "ApiUrl",
      {
        value: api.url
      }
    );

    new cdk.CfnOutput(
      this,
      "BucketName",
      {
        value:
          bucket.bucketName
      }
    );
  }
}