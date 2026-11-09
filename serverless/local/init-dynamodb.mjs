import { readFile } from "node:fs/promises";
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { parseDocument } from "yaml";

// SAM Local overrides table names with these values in start.ps1. Keep this
// mapping synchronized with the DynamoDB resources declared in the template.
const tableNames = {
  UsersTable: "local-users",
  UniqueKeysTable: "local-unique-keys",
  GroupsTable: "local-groups",
  GroupMembersTable: "local-group-members",
  QuizzesTable: "local-quizzes",
  QuizResultsTable: "local-quiz-results",
};

// Read the actual table definitions instead of maintaining a second schema.
const template = parseDocument(await readFile(new URL("../template.yaml", import.meta.url), "utf8"));
if (template.errors.length) {
  throw new Error(`Invalid SAM template: ${template.errors.map((error) => error.message).join(", ")}`);
}
const resources = template.toJS().Resources;
const dynamoResources = Object.entries(resources).filter(([, resource]) => resource.Type === "AWS::DynamoDB::Table");
if (dynamoResources.length !== Object.keys(tableNames).length ||
    dynamoResources.some(([id]) => !Object.hasOwn(tableNames, id))) {
  throw new Error("DynamoDB tables in template.yaml do not match the local table mapping.");
}

// Restrict table creation to a local, explicitly ported HTTP endpoint.
const endpoint = new URL(process.argv[2]);
if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" ||
    !endpoint.port || endpoint.username || endpoint.password ||
    endpoint.pathname !== "/" || endpoint.search || endpoint.hash) {
  throw new Error("Expected a loopback DynamoDB Local endpoint.");
}

const client = new DynamoDBClient({
  endpoint: endpoint.href,
  region: "eu-north-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
  maxAttempts: 1,
});
// Container startup is asynchronous; wait for its API before creating tables.
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    await client.send(new ListTablesCommand({}));
    ready = true;
    break;
  } catch (error) {
    if (attempt === 29) throw new Error("DynamoDB Local did not become ready.", { cause: error });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
if (!ready) throw new Error("DynamoDB Local did not become ready.");

// Only key and index attributes are needed by CreateTable. Wait for the table
// and all its indexes before allowing the API to serve requests.
for (const [id, resource] of dynamoResources) {
  const { AttributeDefinitions, KeySchema, GlobalSecondaryIndexes } = resource.Properties;
  const TableName = tableNames[id];
  await client.send(new CreateTableCommand({
    TableName,
    AttributeDefinitions,
    KeySchema,
    BillingMode: "PAY_PER_REQUEST",
    ...(GlobalSecondaryIndexes ? { GlobalSecondaryIndexes } : {}),
  }));
  let active = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const { Table } = await client.send(new DescribeTableCommand({ TableName }));
    if (Table.TableStatus === "ACTIVE" && (Table.GlobalSecondaryIndexes ?? []).every((index) => index.IndexStatus === "ACTIVE")) {
      active = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!active) throw new Error(`Table ${TableName} did not become active.`);
  console.log(`Created ${TableName}`);
}
client.destroy();
