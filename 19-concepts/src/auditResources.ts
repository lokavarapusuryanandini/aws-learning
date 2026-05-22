import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand
} from "@aws-sdk/client-resource-groups-tagging-api";

import {
  STSClient,
  GetCallerIdentityCommand
} from "@aws-sdk/client-sts";

const REGION = "ap-south-1";

const taggingClient =
  new ResourceGroupsTaggingAPIClient({
    region: REGION
  });

const stsClient =
  new STSClient({
    region: REGION
  });

async function auditResources() {

  try {

    /*
      AWS Account Details
    */

    const identity =
      await stsClient.send(
        new GetCallerIdentityCommand({})
      );

    console.log("\nAWS Account Details\n");

    console.log(
      "Account ID:",
      identity.Account
    );

    console.log(
      "User ARN:",
      identity.Arn
    );

    /*
      Fetch tagged resources
    */

    const response =
      await taggingClient.send(
        new GetResourcesCommand({})
      );

    console.log(
      "\nTagged AWS Resources\n"
    );

    if (
      response.ResourceTagMappingList
        ?.length
    ) {

      response.ResourceTagMappingList.forEach(
        (resource, index) => {

          console.log(
            `${index + 1}.`,
            resource.ResourceARN
          );

          if (resource.Tags?.length) {

            console.log("Tags:");

            resource.Tags.forEach((tag) => {

              console.log(
                `- ${tag.Key}: ${tag.Value}`
              );
            });
          }

          console.log(
            "----------------------"
          );
        }
      );

    } else {

      console.log(
        "No tagged resources found"
      );
    }

  } catch (error) {

    console.error(error);
  }
}

auditResources();