const express = require("express");

const app = express();

const PORT = 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Hello from ECS Fargate 🚀",
    service: "aws-learning-day13",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});