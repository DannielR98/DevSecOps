import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { doc, table } from "../lib/db.js";

const eventBridge = new EventBridgeClient({});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const valid = (item) =>
  item && item.type === "QuizCreated" &&
  typeof item.id === "string" && uuid.test(item.id) &&
  typeof item.quiz_id === "string" && uuid.test(item.quiz_id) &&
  typeof item.group_id === "string" && uuid.test(item.group_id) &&
  typeof item.createdAt === "string" && timestamp.test(item.createdAt) &&
  Number.isFinite(Date.parse(item.createdAt));

const entry = (item, bus) => ({
  EventBusName: bus,
  Source: "quiz.app",
  DetailType: "QuizCreated",
  Time: new Date(item.createdAt),
  Detail: JSON.stringify({
    event_id: item.id,
    quiz_id: item.quiz_id,
    group_id: item.group_id,
    createdAt: item.createdAt,
  }),
});

// A successful publish can be repeated after a crash or a failed delete.
// The stable event_id lets consumers identify these duplicates.
async function publishBatch(items, bus) {
  let response;
  try {
    response = await eventBridge.send(new PutEventsCommand({
      Entries: items.map((item) => entry(item, bus)),
    }));
  } catch (error) {
    console.error("EventBridge publish failed:", error);
    return items.length;
  }

  const results = response.Entries;
  if (!Array.isArray(results) || results.length !== items.length ||
      !Number.isInteger(response.FailedEntryCount) ||
      results.some((result) => !result || typeof result !== "object") ||
      response.FailedEntryCount !== results.filter((result) => result.ErrorCode).length) {
    console.error("EventBridge returned an ambiguous batch response; retaining outbox records");
    return items.length;
  }

  let failures = 0;
  for (let i = 0; i < items.length; i++) {
    const result = results[i];
    if (result.ErrorCode || result.ErrorMessage || typeof result.EventId !== "string" || !result.EventId) {
      console.error("EventBridge rejected or did not acknowledge outbox event:", items[i].id, result.ErrorCode);
      failures++;
      continue;
    }
    const item = items[i];
    try {
      await doc.send(new DeleteCommand({
        TableName: table.outbox,
        Key: { id: item.id },
        ConditionExpression: "#type = :type AND quiz_id = :quiz AND group_id = :group AND createdAt = :created",
        ExpressionAttributeNames: { "#type": "type" },
        ExpressionAttributeValues: {
          ":type": item.type,
          ":quiz": item.quiz_id,
          ":group": item.group_id,
          ":created": item.createdAt,
        },
      }));
    } catch (error) {
      console.error("Failed to remove published outbox event:", item.id, error);
      failures++;
    }
  }
  return failures;
}

// Schedule repeated invocations. Failed items remain in the table for the
// next scan; an optional start key supports operator-directed recovery.
export const handler = async (event = {}, context = {}) => {
  if (!table.outbox || !process.env.EVENT_BUS_NAME) {
    throw new Error("OUTBOX_TABLE and EVENT_BUS_NAME are required");
  }
  let key = event.startKey;
  if (key !== undefined &&
      (!key || Object.keys(key).length !== 1 || typeof key.id !== "string" || !uuid.test(key.id))) {
    throw new Error("Invalid startKey");
  }
  let failures = 0;
  let scanned = 0;
  do {
    if (context.getRemainingTimeInMillis && context.getRemainingTimeInMillis() < 15000) {
      throw new Error(`Outbox relay ran out of time before scanning the next page; resume after ${key?.id ?? "start"}`);
    }
    const page = await doc.send(new ScanCommand({
      TableName: table.outbox,
      ConsistentRead: true,
      Limit: 100,
      ExclusiveStartKey: key,
      ProjectionExpression: "id, #type, quiz_id, group_id, createdAt",
      ExpressionAttributeNames: { "#type": "type" },
    }));
    const ready = [];
    for (const item of page.Items ?? []) {
      scanned++;
      if (valid(item)) ready.push(item);
      else {
        console.error("Malformed outbox record; manual intervention required:", item.id);
        failures++;
      }
    }
    for (let i = 0; i < ready.length; i += 10) {
      failures += await publishBatch(ready.slice(i, i + 10), process.env.EVENT_BUS_NAME);
    }
    key = page.LastEvaluatedKey;
  } while (key);
  if (failures) throw new Error(`Outbox relay left ${failures} record(s) for retry`);
  return { scanned };
};
