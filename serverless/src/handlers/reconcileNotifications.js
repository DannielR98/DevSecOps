import {
  CreateTopicCommand,
  DeleteTopicCommand,
  ListTopicsCommand,
  SubscribeCommand,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";
import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { doc, table } from "../lib/db.js";
import { withNotificationLock } from "../lib/notificationLock.js";
import {
  listSubscriptions, normalizeEmail, sns, subscriptionInfo, topicArn, topicConfig, uuidPattern,
} from "../lib/notificationTopics.js";

async function scan(TableName, projection) {
  const items = [];
  let key;
  do {
    const page = await doc.send(new ScanCommand({
      TableName, ConsistentRead: true, ProjectionExpression: projection,
      ExclusiveStartKey: key,
    }));
    items.push(...(page.Items ?? []));
    key = page.LastEvaluatedKey;
  } while (key);
  return items;
}

async function listTopics(config) {
  const topics = new Set();
  let token;
  do {
    const page = await sns.send(new ListTopicsCommand({ NextToken: token }));
    for (const { TopicArn } of page.Topics ?? []) {
      if (typeof TopicArn === "string" && TopicArn.startsWith(config.arnPrefix) &&
          uuidPattern.test(TopicArn.slice(config.arnPrefix.length))) topics.add(TopicArn);
    }
    token = page.NextToken;
  } while (token);
  return topics;
}

async function groupExists(id) {
  const response = await doc.send(new GetCommand({
    TableName: table.groups, Key: { id }, ConsistentRead: true,
    ProjectionExpression: "id",
  }));
  return Boolean(response.Item);
}

async function reconcileGroup(config, group, emails) {
  if (!(await groupExists(group.id))) return;
  const arn = topicArn(config, group.id);
  const topic = await sns.send(new CreateTopicCommand({ Name: `${config.namePrefix}${group.id}` }));
  if (topic.TopicArn !== arn) throw new Error("Unexpected SNS topic ARN");
  if (!(await groupExists(group.id))) {
    await sns.send(new DeleteTopicCommand({ TopicArn: arn }));
    return;
  }
  const subscriptions = (await listSubscriptions(arn))
    .map((subscription) => subscriptionInfo(subscription, arn));
  const existing = new Set();
  for (const { email, subscriptionArn, pending } of subscriptions) {
    if (pending) {
      if (emails.has(email)) existing.add(email);
      continue;
    }
    if (emails.has(email)) {
      existing.add(email);
    } else {
      await sns.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
    }
  }
  for (const email of emails) {
    if (!existing.has(email)) {
      const result = await sns.send(new SubscribeCommand({ TopicArn: arn, Protocol: "email", Endpoint: email }));
      if (typeof result.SubscriptionArn !== "string" || !result.SubscriptionArn) {
        throw new Error("SNS subscribe returned no subscription status");
      }
    }
  }
}

export const handler = () => withNotificationLock(async () => {
  const config = topicConfig();
  if (!table.groups || !table.members || !table.users) throw new Error("Missing table configuration");

  const [groups, members, users, topics] = await Promise.all([
    scan(table.groups, "id, owner_id"),
    scan(table.members, "id, group_id, user_id"),
    scan(table.users, "user_id, email"),
    listTopics(config),
  ]);
  const groupMap = new Map();
  for (const group of groups) {
    topicArn(config, group.id);
    groupMap.set(group.id, group);
  }
  const userMap = new Map(users.map((user) => [user.user_id, user]));
  const desired = new Map(groups.map((group) => [group.id, new Set()]));
  const invalidGroups = new Set();
  const addUser = (groupId, userId) => {
    if (!desired.has(groupId)) return;
    const user = userMap.get(userId);
    if (!user) return; // A deleted user may still have an old membership.
    try {
      desired.get(groupId).add(normalizeEmail(user.email));
    } catch (error) {
      console.error("Invalid member email for group:", groupId, error);
      invalidGroups.add(groupId);
    }
  };
  for (const group of groups) addUser(group.id, group.owner_id);
  for (const member of members) addUser(member.group_id, member.user_id);

  let failures = 0;
  for (const group of groups) {
    if (invalidGroups.has(group.id)) {
      failures++;
      continue;
    }
    try {
      await reconcileGroup(config, group, desired.get(group.id));
    } catch (error) {
      console.error("SNS group reconciliation failed:", group.id, error);
      failures++;
    }
  }
  for (const arn of topics) {
    const id = arn.slice(config.arnPrefix.length);
    if (groupMap.has(id)) continue;
    try {
      if (!(await groupExists(id))) await sns.send(new DeleteTopicCommand({ TopicArn: arn }));
    } catch (error) {
      console.error("SNS orphan topic cleanup failed:", id, error);
      failures++;
    }
  }
  if (failures) throw new Error(`Notification reconciliation failed for ${failures} group topic(s); retry`);
  return { groups: groups.length, managedTopics: topics.size };
});
