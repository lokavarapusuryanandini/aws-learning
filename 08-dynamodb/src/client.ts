import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Low-level client — required for table management (CreateTable, UpdateTable, etc.)
// Returns raw AttributeValue format: { S: "hello" }, { N: "42" }, { BOOL: true }
export const ddb = new DynamoDBClient({ region: "us-east-1" });

// Document client — wraps ddb and auto-marshals/unmarshals JS ↔ DynamoDB types
// Use this for data operations (PutItem, GetItem, Query, etc.)
// You write { userId: "u1", price: 9.99 } instead of { userId: { S: "u1" }, price: { N: "9.99" } }
export const docClient = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: {
    removeUndefinedValues: true, // don't send null for undefined JS fields
    convertEmptyValues: false,
  },
});

export const TABLE_NAME = "aws-learning-day08-orders";
export const GSI_NAME = "status-createdAt-index";
