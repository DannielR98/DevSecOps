import { DeleteTopicCommand } from "@aws-sdk/client-sns";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { doc, table } from "./db.js";
import { removeConfirmedGroupEmail, sns, topicArn, topicConfig } from "./notificationTopics.js";

async function scanAll(TableName, filter, values, projection) {
  const items = [];
  let key;
  do {
    const page = await doc.send(new ScanCommand({
      TableName,
      ConsistentRead: true,
      FilterExpression: filter,
      ExpressionAttributeValues: values,
      ProjectionExpression: projection,
      ExclusiveStartKey: key,
    }));
    items.push(...(page.Items ?? []));
    key = page.LastEvaluatedKey;
  } while (key);
  return items;
}

export async function removeUserSubscriptions(user) {
  if (process.env.NOTIFICATIONS_DISABLED === "true") return;
  const [members, owned] = await Promise.all([
    scanAll(table.members, "user_id = :user", { ":user": user.user_id }, "group_id"),
    scanAll(table.groups, "owner_id = :user", { ":user": user.user_id }, "id"),
  ]);
  const ids = new Set([...members.map((member) => member.group_id), ...owned.map((group) => group.id)]);
  for (const id of ids) await removeConfirmedGroupEmail(id, user.email);
}

export async function removeMemberSubscription(groupId, email) {
  if (process.env.NOTIFICATIONS_DISABLED !== "true") {
    await removeConfirmedGroupEmail(groupId, email);
  }
}

export async function removeGroupTopic(groupId) {
  if (process.env.NOTIFICATIONS_DISABLED !== "true") {
    await sns.send(new DeleteTopicCommand({ TopicArn: topicArn(topicConfig(), groupId) }));
  }
}
