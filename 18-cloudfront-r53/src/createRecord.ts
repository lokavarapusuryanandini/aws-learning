import {
  Route53Client,
  ChangeResourceRecordSetsCommand
} from "@aws-sdk/client-route-53";

const client = new Route53Client({
  region: "us-east-1"
});

const HOSTED_ZONE_ID =
  "Z02855153QPMH4UMRZGIR";

const DOMAIN_NAME =
  "nandini.com";

async function createRecord() {

  try {

    await client.send(
      new ChangeResourceRecordSetsCommand({

        HostedZoneId: HOSTED_ZONE_ID,

        ChangeBatch: {
          Changes: [
            {
              Action: "CREATE",

              ResourceRecordSet: {

                Name: DOMAIN_NAME,

                Type: "A",

                TTL: 300,

                ResourceRecords: [
                  {
                    Value: "1.1.1.1"
                  }
                ]
              }
            }
          ]
        }
      })
    );

    console.log(
      "Route53 record created"
    );

  } catch (error) {
    console.error(error);
  }
}

createRecord();