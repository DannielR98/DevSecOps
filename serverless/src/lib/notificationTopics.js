import {
  ListSubscriptionsByTopicCommand,
  SNSClient,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";

// Initialize the SNS client and define patterns for UUIDs and topic prefixes.
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

// Construct the ARN for an SNS topic corresponding to a specific group ID.
export function topicArn(config, groupId) {
  if (typeof groupId !== "string" || !uuidPattern.test(groupId)) {
    throw new Error("Invalid group ID");
  }
  return `${config.arnPrefix}${groupId}`;
}

// Normalize and validate an email address for SNS subscriptions.
export function normalizeEmail(email) {
  if (typeof email !== "string" || email.length > 254 ||
    !/^[^\s@]+@[^\s@]+$/.test(email)) {
    throw new Error("Invalid email");
  }
  return email.toLowerCase();
}

// List all subscriptions for a given SNS topic ARN.
export async function listSubscriptions(arn) {
  const subscriptions = [];
  let token;
  // Initialize the pagination token to undefined to start from the first page.
  do {
    const page = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: arn, NextToken: token }));
    subscriptions.push(...(page.Subscriptions ?? []));
    token = page.NextToken;
  } while (token);
  return subscriptions;
}

// Extract and validate subscription information for a given SNS subscription and topic ARN.
export function subscriptionInfo(subscription, arn) {
  // Ensure the subscription is for an email endpoint and has the necessary fields.
  if (subscription.Protocol !== "email" || typeof subscription.Endpoint !== "string" ||
    typeof subscription.SubscriptionArn !== "string") {
    throw new Error("Unexpected subscription on managed topic");
  }
  // Normalize the email and extract the subscription ARN and pending status.
  const email = normalizeEmail(subscription.Endpoint);
  const subscriptionArn = subscription.SubscriptionArn;
  const pending = subscriptionArn === "PendingConfirmation";
  // Ensure that the subscription ARN matches the expected topic ARN if it is not pending.
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
  // Attempt to list all subscriptions for the target SNS topic.
  try {
    subscriptions = await listSubscriptions(arn);
  } catch (error) {
    if (error.name === "NotFoundException") return { removed: 0, pending: 0 };
    throw error;
  }
  // Identify all subscriptions that match the target email.
  const matching = subscriptions.map((subscription) => subscriptionInfo(subscription, arn))
    .filter((subscription) => subscription.email === target);
  let removed = 0;
  // Remove all confirmed subscriptions for the target email.
  for (const subscription of matching) {
    if (!subscription.pending) {
      await sns.send(new UnsubscribeCommand({ SubscriptionArn: subscription.subscriptionArn }));
      removed++;
    }
  }
  // Return the count of removed and pending subscriptions for the target email.
  return { removed, pending: matching.filter((subscription) => subscription.pending).length };
}
