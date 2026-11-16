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

  // Acquire a global lock for notification-affecting operations.
  // Determine the DynamoDB table used for the notification lock.
  const TableName = process.env.NOTIFICATION_LOCK_TABLE;
  if (!TableName || !TableName.trim()) {
    throw new Error("NOTIFICATION_LOCK_TABLE is required when notifications are enabled");
  }
  const owner = randomUUID();
  const id = "notifications";
  // Attempt to acquire the lock in the DynamoDB table.
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
    // the lock when ownership is uncertain. This ensures that only one operation
    // can hold the lock at a time and prevents race conditions.
    throw new Error("Notification lock acquisition failed; operator recovery may be required", { cause: error });
  }

  let value;
  let operationError;
  let operationFailed = false;
  // Execute the operation while holding the lock. Capture any errors for later handling.
  try {
    value = await operation();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }
  // Release the lock after the operation has completed, regardless of success or failure.
  try {
    // Attempt to release the lock in the DynamoDB table.
    await doc.send(new DeleteCommand({
      TableName,
      Key: { id },
      ConditionExpression: "#owner = :owner",
      ExpressionAttributeNames: { "#owner": "owner" },
      ExpressionAttributeValues: { ":owner": owner },
    }));
  } catch (error) {
    // If releasing the lock fails, create an error indicating manual recovery is needed.
    const releaseError = new Error(
      "Notification lock release failed; block further operations and perform manual recovery",
      { cause: error },
    );
    if (operationFailed) releaseError.operationError = operationError;
    throw releaseError;
  }
  // At this point, the lock has been successfully released. If the operation failed, rethrow the captured error.
  if (operationFailed) throw operationError;
  return value;
}
