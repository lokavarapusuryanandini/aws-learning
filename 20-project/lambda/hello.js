exports.handler = async (event) => {

  console.log("Incoming Event:", event);

  return {
    statusCode: 200,

    headers: {
      "Content-Type":
        "application/json"
    },

    body: JSON.stringify({
      success: true,
      message:
        "Hello from AWS CDK Serverless Project 🚀"
    })
  };
};