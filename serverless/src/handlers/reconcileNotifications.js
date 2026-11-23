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

// Scan a DynamoDB table with consistent reads and optional projection.
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

// List all SNS topics that match the given configuration.
async function listTopics(config) {
  const topics = new Set();
  let token;
  do {
    // List the SNS topics using the NextToken for pagination.
    const page = await sns.send(new ListTopicsCommand({ NextToken: token }));
    for (const { TopicArn } of page.Topics ?? []) {
      if (typeof TopicArn === "string" && TopicArn.startsWith(config.arnPrefix) &&
        uuidPattern.test(TopicArn.slice(config.arnPrefix.length))) topics.add(TopicArn);
    }
    token = page.NextToken;
  } while (token);
  return topics;
}

// Check if a group exists in the DynamoDB table.
async function groupExists(id) {
  const response = await doc.send(new GetCommand({
    TableName: table.groups, Key: { id }, ConsistentRead: true,
    ProjectionExpression: "id",
  }));
  return Boolean(response.Item);
}

// Reconcile the SNS subscriptions for a specific group based on the desired email list.
async function reconcileGroup(config, group, emails) {
  if (!(await groupExists(group.id))) return;
  // Construct the SNS topic ARN for the group.
  const arn = topicArn(config, group.id);
  // Create the SNS topic for the group if it doesn't exist.
  const topic = await sns.send(new CreateTopicCommand({ Name: `${config.namePrefix}${group.id}` }));
  if (topic.TopicArn !== arn) throw new Error("Unexpected SNS topic ARN");
  // If the group no longer exists, delete the SNS topic and return early.
  if (!(await groupExists(group.id))) {
    await sns.send(new DeleteTopicCommand({ TopicArn: arn }));
    return;
  }
  // Reconcile the desired subscriptions for the group.
  const subscriptions = (await listSubscriptions(arn))
    .map((subscription) => subscriptionInfo(subscription, arn));
  // Track the existing subscriptions for the group.
  const existing = new Set();
  for (const { email, subscriptionArn, pending } of subscriptions) {
    if (pending) {
      if (emails.has(email)) existing.add(email);
      continue;
    }
    // If the subscription is not pending, check if the email is still desired.
    if (emails.has(email)) {
      existing.add(email);
    } else {
      await sns.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
    }
  }
  // Subscribe any new emails that are not already subscribed.
  for (const email of emails) {
    // Subscribe any new emails that are not already subscribed.
    if (!existing.has(email)) {
      const result = await sns.send(new SubscribeCommand({ TopicArn: arn, Protocol: "email", Endpoint: email }));
      // Check that the SNS subscribe returned a valid subscription ARN.
      if (typeof result.SubscriptionArn !== "string" || !result.SubscriptionArn) {
        throw new Error("SNS subscribe returned no subscription status");
      }
    }
  }
}

// Entry point for the AWS Lambda function that reconciles SNS notifications for groups.
const reconcile = () => withNotificationLock(async () => {
  const config = topicConfig();
  if (!table.groups || !table.members || !table.users) throw new Error("Missing table configuration");

  // Map existing SNS topics by their ARN for quick lookup.
  const [groups, members, users, topics] = await Promise.all([
    scan(table.groups, "id, owner_id"),
    scan(table.members, "id, group_id, user_id"),
    scan(table.users, "user_id, email"),
    listTopics(config),
  ]);
  // Map groups by their ID for quick lookup.
  const groupMap = new Map();
  for (const group of groups) {
    // Ensure the SNS topic ARN is constructed for the group.
    topicArn(config, group.id);
    groupMap.set(group.id, group);
  }

  // Map existing SNS topics by their ARN for quick lookup.
  const userMap = new Map(users.map((user) => [user.user_id, user]));
  const desired = new Map(groups.map((group) => [group.id, new Set()]));
  const invalidGroups = new Set();
  // Add a user to the desired subscription set for a group.
  const addUser = (groupId, userId) => {
    if (!desired.has(groupId)) return;
    const user = userMap.get(userId);
    if (!user) return; // A deleted user may still have an old membership.
    try {
      desired.get(groupId).add(normalizeEmail(user.email));
    } catch {
      console.error("Invalid member email during notification reconciliation");
      invalidGroups.add(groupId);
    }
  };
  // Add the group owner to the desired subscription set for each group.
  for (const group of groups) addUser(group.id, group.owner_id);
  // Add each group member to the desired subscription set for their group.
  for (const member of members) addUser(member.group_id, member.user_id);

  // Reconcile each group's desired subscriptions with the actual SNS topics.
  let failures = 0;
  for (const group of groups) {
    if (invalidGroups.has(group.id)) {
      failures++;
      continue;
    }
    try {
      await reconcileGroup(config, group, desired.get(group.id));
    } catch {
      console.error("SNS group reconciliation failed");
      failures++;
    }
  }
  // Clean up any orphan SNS topics that no longer correspond to a group.
  for (const arn of topics) {
    const id = arn.slice(config.arnPrefix.length);
    if (groupMap.has(id)) continue;
    // If the topic does not correspond to an existing group, attempt to delete it.
    try {
      if (!(await groupExists(id))) await sns.send(new DeleteTopicCommand({ TopicArn: arn }));
    } catch {
      console.error("SNS orphan topic cleanup failed");
      failures++;
    }
  }
  // Throw an error if any failures occurred during reconciliation.
  if (failures) throw new Error(`Notification reconciliation failed for ${failures} group topic(s); retry`);
  return { groups: groups.length, managedTopics: topics.size };
});

export const handler = async () => {
  try {
    return await reconcile();
  } catch {
    console.error("Notification reconciliation failed; check the lock and retry");
    throw new Error("Notification reconciliation failed");
  }
};
