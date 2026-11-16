import { randomUUID } from "node:crypto";
import { DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { doc } from "./db.js";
import { HttpError } from "./errors.js";

// All notification-affecting operations must use this same global lock,
// including reconciliation and every group, membership or profile mutation.
// There is deliberately no TTL: an interrupted operation requires manual recovery.
export async function withNotificationLock(operation) {
  if (typeof operation !== "function") throw new TypeError("Notification lock operation must be a function");
  if (process.env.NOTIFICATIONS_DISABLED === "true") return operation();

  const TableName = process.env.NOTIFICATION_LOCK_TABLE;
  if (!TableName || !TableName.trim()) {
    throw new Error("NOTIFICATION_LOCK_TABLE is required when notifications are enabled");
  }
  const owner = randomUUID();
  const id = "notifications";
  try {
    await doc.send(new PutCommand({
      TableName,
      Item: { id, owner, acquiredAt: new Date().toISOString() },
      ConditionExpression: "attribute_not_exists(id)",
    }));
  } catch (error) {
    if (error?.name === "ConditionalCheckFailedException") {
      throw new HttpError(503, "Notification operations are locked; retry later or contact an operator");
    }
    // A failed request may have committed; never run the callback or delete
    // the lock when ownership is uncertain.
    throw new Error("Notification lock acquisition failed; operator recovery may be required", { cause: error });
  }

  let value;
  let operationError;
  let operationFailed = false;
  try {
    value = await operation();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }
  try {
    await doc.send(new DeleteCommand({
      TableName,
      Key: { id },
      ConditionExpression: "#owner = :owner",
      ExpressionAttributeNames: { "#owner": "owner" },
      ExpressionAttributeValues: { ":owner": owner },
    }));
  } catch (error) {
    const releaseError = new Error(
      "Notification lock release failed; block further operations and perform manual recovery",
      { cause: error },
    );
    if (operationFailed) releaseError.operationError = operationError;
    throw releaseError;
  }
  if (operationFailed) throw operationError;
  return value;
}
