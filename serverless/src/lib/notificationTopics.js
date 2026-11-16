import {
  ListSubscriptionsByTopicCommand,
  SNSClient,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";

export const sns = new SNSClient({});
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const prefixPattern = /^arn:(aws|aws-us-gov|aws-cn):sns:[a-z0-9-]+:\d{12}:([a-zA-Z0-9_-]+-)$/;

// Use a stack-unique prefix; never share it with another application.
export function topicConfig() {
  const arnPrefix = process.env.SNS_TOPIC_ARN_PREFIX ?? "";
  const match = arnPrefix.match(prefixPattern);
  if (!match || match[2].length > 220) throw new Error("Invalid SNS_TOPIC_ARN_PREFIX");
  return { arnPrefix, namePrefix: match[2] };
}

export function topicArn(config, groupId) {
  if (typeof groupId !== "string" || !uuidPattern.test(groupId)) {
    throw new Error("Invalid group ID");
  }
  return `${config.arnPrefix}${groupId}`;
}

export function normalizeEmail(email) {
  if (typeof email !== "string" || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+$/.test(email)) {
    throw new Error("Invalid email");
  }
  return email.toLowerCase();
}

export async function listSubscriptions(arn) {
  const subscriptions = [];
  let token;
  do {
    const page = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: arn, NextToken: token }));
    subscriptions.push(...(page.Subscriptions ?? []));
    token = page.NextToken;
  } while (token);
  return subscriptions;
}

export function subscriptionInfo(subscription, arn) {
  if (subscription.Protocol !== "email" || typeof subscription.Endpoint !== "string" ||
      typeof subscription.SubscriptionArn !== "string") {
    throw new Error("Unexpected subscription on managed topic");
  }
  const email = normalizeEmail(subscription.Endpoint);
  const subscriptionArn = subscription.SubscriptionArn;
  const pending = subscriptionArn === "PendingConfirmation";
  if (!pending && !subscriptionArn.startsWith(`${arn}:`)) {
    throw new Error("Unexpected subscription ARN");
  }
  return { email, subscriptionArn, pending };
}

// Caller must coordinate this operation with membership changes and the
// reconciler. Pending SNS email subscriptions cannot be manually removed.
export async function removeConfirmedGroupEmail(groupId, email) {
  const arn = topicArn(topicConfig(), groupId);
  const target = normalizeEmail(email);
  let subscriptions;
  try {
    subscriptions = await listSubscriptions(arn);
  } catch (error) {
    if (error.name === "NotFoundException") return { removed: 0, pending: 0 };
    throw error;
  }
  const matching = subscriptions.map((subscription) => subscriptionInfo(subscription, arn))
    .filter((subscription) => subscription.email === target);
  let removed = 0;
  for (const subscription of matching) {
    if (!subscription.pending) {
      await sns.send(new UnsubscribeCommand({ SubscriptionArn: subscription.subscriptionArn }));
      removed++;
    }
  }
  return { removed, pending: matching.filter((subscription) => subscription.pending).length };
}
