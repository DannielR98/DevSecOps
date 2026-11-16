import { DeleteTopicCommand } from "@aws-sdk/client-sns";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { doc, table } from "./db.js";
import { removeConfirmedGroupEmail, sns, topicArn, topicConfig } from "./notificationTopics.js";


// Scan all items from a DynamoDB table matching the filter criteria.
async function scanAll(TableName, filter, values, projection) {
  const items = [];
  let key;
  // Loop through all pages of the scan results. 
  // Initialize the exclusive start key to undefined to begin scanning from the start.
  do {
    const page = await doc.send(new ScanCommand({
      TableName,
      ConsistentRead: true,
      FilterExpression: filter,
      ExpressionAttributeValues: values,
      ProjectionExpression: projection,
      ExclusiveStartKey: key,
    }));
    // Append the items from the current page to the overall results array.
    items.push(...(page.Items ?? []));
    key = page.LastEvaluatedKey;
  } while (key);
  return items;
}

// Remove all SNS subscriptions for a given user across all groups they belong to or own.
export async function removeUserSubscriptions(user) {
  if (process.env.NOTIFICATIONS_DISABLED === "true") return;
  const [members, owned] = await Promise.all([
    scanAll(table.members, "user_id = :user", { ":user": user.user_id }, "group_id"),
    scanAll(table.groups, "owner_id = :user", { ":user": user.user_id }, "id"),
  ]);
  const ids = new Set([...members.map((member) => member.group_id), ...owned.map((group) => group.id)]);
  for (const id of ids) await removeConfirmedGroupEmail(id, user.email);
}

// Remove the SNS subscription for a specific user in a specific group.
export async function removeMemberSubscription(groupId, email) {
  if (process.env.NOTIFICATIONS_DISABLED !== "true") {
    // Remove the confirmed group email subscription for the specified group and user.
    await removeConfirmedGroupEmail(groupId, email);
  }
}

// Remove the SNS topic for a specific group.
export async function removeGroupTopic(groupId) {
  if (process.env.NOTIFICATIONS_DISABLED !== "true") {
    // Delete the SNS topic for the specified group.
    await sns.send(new DeleteTopicCommand({ TopicArn: topicArn(topicConfig(), groupId) }));
  }
}
