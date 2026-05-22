const API_URL =
  "https://u6ti7u4yp8.execute-api.us-east-1.amazonaws.com/prod/";

async function testEndpoint() {

  try {

    console.log(`
======================================
 TESTING SERVERLESS API
======================================
`);

    const response =
      await fetch(API_URL);

    const data =
      await response.json();

    console.log(
      "Status:",
      response.status
    );

    console.log(
      "\nResponse:"
    );

    console.log(data);

    console.log(`
======================================
 TEST COMPLETE
======================================
`);

  } catch (error) {

    console.error(
      "API Test Failed"
    );

    console.error(error);
  }
}

testEndpoint();