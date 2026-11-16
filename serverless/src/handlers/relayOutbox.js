import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { doc, table } from "../lib/db.js";

const eventBridge = new EventBridgeClient({});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
// Validates that an outbox item has the required structure and types.
const valid = (item) =>
  item && item.type === "QuizCreated" &&
  typeof item.id === "string" && uuid.test(item.id) &&
  typeof item.quiz_id === "string" && uuid.test(item.quiz_id) &&
  typeof item.group_id === "string" && uuid.test(item.group_id) &&
  typeof item.createdAt === "string" && timestamp.test(item.createdAt) &&
  Number.isFinite(Date.parse(item.createdAt));

// Constructs an EventBridge entry for the given outbox item and bus.
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

// Publishes a batch of outbox items to EventBridge.
// Returns the number of failed items that were not successfully published and deleted.
// A successful publish can be repeated after a crash or a failed delete.
// The stable event_id lets consumers identify these duplicates.
async function publishBatch(items, bus) {
  let response;
  // Attempt to publish the batch to EventBridge.
  try {
    response = await eventBridge.send(new PutEventsCommand({
      Entries: items.map((item) => entry(item, bus)),
    }));
  } catch {
    console.error("EventBridge publish failed");
    return items.length;
  }

  // If the publish succeeded, response contains the results for each entry.
  const results = response.Entries;
  if (!Array.isArray(results) || results.length !== items.length ||
    !Number.isInteger(response.FailedEntryCount) ||
    results.some((result) => !result || typeof result !== "object") ||
    response.FailedEntryCount !== results.filter((result) => result.ErrorCode).length) {
    console.error("EventBridge returned an ambiguous batch response; retaining outbox records");
    return items.length;
  }

  // Iterate over each item and check if it was successfully published.
  let failures = 0;
  for (let i = 0; i < items.length; i++) {
    const result = results[i];
    // If the result contains an error or lacks a valid EventId, count it as a failure.
    if (result.ErrorCode || result.ErrorMessage || typeof result.EventId !== "string" || !result.EventId) {
      console.error("EventBridge rejected or did not acknowledge an outbox event");
      failures++;
      continue;
    }
    // Attempt to delete the successfully published item from the outbox table.
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
    } catch {
      console.error("Failed to remove published outbox event");
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
  // Extract the start key from the event, if provided, for paginated scanning.
  let key = event.startKey;
  if (key !== undefined &&
    (!key || Object.keys(key).length !== 1 || typeof key.id !== "string" || !uuid.test(key.id))) {
    throw new Error("Invalid startKey");
  }
  let failures = 0;
  let scanned = 0;
  // Loop through pages of outbox items until all are processed or time runs out.
  do {
    // Check if there is enough remaining time to process the next page.
    if (context.getRemainingTimeInMillis && context.getRemainingTimeInMillis() < 15000) {
      const cursor = typeof key?.id === "string" && uuid.test(key.id) ? key.id : "start";
      throw new Error(`Outbox relay ran out of time before scanning the next page; resume after ${cursor}`);
    }
    let page;
    try {
      page = await doc.send(new ScanCommand({
        TableName: table.outbox,
        ConsistentRead: true,
        Limit: 100,
        ExclusiveStartKey: key,
        ProjectionExpression: "id, #type, quiz_id, group_id, createdAt",
        ExpressionAttributeNames: { "#type": "type" },
      }));
    } catch {
      throw new Error("Outbox scan failed");
    }
    // Prepare a list of outbox items that are ready to be published.
    const ready = [];
    for (const item of page.Items ?? []) {
      scanned++;
      if (valid(item)) ready.push(item);
      else {
        // Log malformed items and increment the failure count.
        console.error("Malformed outbox record; manual intervention required");
        failures++;
      }
    }
    // Publish the ready items in batches of 10 to EventBridge.
    for (let i = 0; i < ready.length; i += 10) {
      failures += await publishBatch(ready.slice(i, i + 10), process.env.EVENT_BUS_NAME);
    }
    key = page.LastEvaluatedKey;
  } while (key);
  // If there were any failures, throw an error to indicate that some items need to be retried.
  if (failures) throw new Error(`Outbox relay left ${failures} record(s) for retry`);
  return { scanned };
};
