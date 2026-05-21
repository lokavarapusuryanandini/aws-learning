import { CloudFormationClient } from "@aws-sdk/client-cloudformation";

export const cfn = new CloudFormationClient({ region: "us-east-1" });

export const STACK_NAME = "aws-learning-day11";

// The template defines the desired state of your infrastructure.
// Parameters allow you to customise behaviour without changing the template.
export function buildTemplate(
  versioningStatus: "Enabled" | "Suspended" = "Enabled"
): string {
  const template = {
    AWSTemplateFormatVersion: "2010-09-09",

    Description:
      "aws-learning Day 11 - CloudFormation stack (S3 bucket + SSM parameter)",

    Parameters: {
      VersioningStatus: {
        Type: "String",
        Default: versioningStatus,
        AllowedValues: ["Enabled", "Suspended"],
        Description: "Enable or suspend S3 versioning",
      },

      Environment: {
        Type: "String",
        Default: "learning",
        Description: "Deployment environment tag value",
      },
    },

    Resources: {
      LearningBucket: {
        Type: "AWS::S3::Bucket",

        DeletionPolicy: "Delete",

        Properties: {
          // AWS will auto-generate a unique bucket name
          VersioningConfiguration: {
            Status: {
              Ref: "VersioningStatus",
            },
          },

          Tags: [
            {
              Key: "project",
              Value: "aws-learning",
            },
            {
              Key: "day",
              Value: "11",
            },
            {
              Key: "environment",
              Value: {
                Ref: "Environment",
              },
            },
          ],
        },
      },

      LearningParameter: {
        Type: "AWS::SSM::Parameter",

        Properties: {
          // Custom path to avoid reserved namespace issues
          Name: {
            "Fn::Sub":
              "/custom1/aws-learning/${AWS::StackName}/bucket-name",
          }, // unique name required

          Type: "String",

          Value: {
            Ref: "LearningBucket",
          },

          Description:
            "aws-learning Day 11 - S3 bucket name",

          // SSM Parameter tags must be object format
          Tags: {
            project: "aws-learning",
            day: "11",
          },
        },
      },
    },

    Outputs: {
      BucketName: {
        Description: "The S3 bucket name",

        Value: {
          Ref: "LearningBucket",
        },

        Export: {
          Name: {
            "Fn::Sub":
              "${AWS::StackName}-BucketName",
          },
        },
      },

      BucketArn: {
        Description: "The S3 bucket ARN",

        Value: {
          "Fn::GetAtt": [
            "LearningBucket",
            "Arn",
          ],
        },
      },

      ParameterName: {
        Description:
          "The SSM parameter storing the bucket name",

        Value: {
          Ref: "LearningParameter",
        },
      },
    },
  };

  return JSON.stringify(template);
}