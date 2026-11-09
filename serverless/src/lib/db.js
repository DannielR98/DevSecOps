import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// DYNAMODB_ENDPOINT allows pointing at DynamoDB Local during development.
// When unset, the AWS SDK uses its normal regional endpoint and credentials.
export const doc = DynamoDBDocumentClient.from(
  new DynamoDBClient(
    process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {},
  ),
  { marshallOptions: { removeUndefinedValues: true } },
);

// Table names are injected by the SAM template; read lazily so tests can set them.
export const table = {
  get users() {
    return process.env.USERS_TABLE;
  },
  get groups() {
    return process.env.GROUPS_TABLE;
  },
  get members() {
    return process.env.MEMBERS_TABLE;
  },
  get quizzes() {
    return process.env.QUIZZES_TABLE;
  },
  get results() {
    return process.env.RESULTS_TABLE;
  },
  get uniques() {
    return process.env.UNIQUES_TABLE;
  },
};
