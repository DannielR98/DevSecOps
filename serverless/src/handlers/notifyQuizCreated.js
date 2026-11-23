import { PublishCommand } from "@aws-sdk/client-sns";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { doc, table } from "../lib/db.js";
import { sns, topicArn, topicConfig, uuidPattern } from "../lib/notificationTopics.js";

// Handler for notifying a group about a newly created quiz via SNS.
export const handler = async (event) => {
  // Extract the configuration for the SNS topic.
  const config = topicConfig();
  if (!table.groups) throw new Error("Missing groups table configuration");
  // Extract the event detail from the incoming event.
  const detail = event?.detail;
  if (event?.source !== "quiz.app" || event?.["detail-type"] !== "QuizCreated" ||
    !detail || typeof detail.event_id !== "string" || !uuidPattern.test(detail.event_id) ||
    typeof detail.quiz_id !== "string" || !uuidPattern.test(detail.quiz_id) ||
    typeof detail.group_id !== "string" || !uuidPattern.test(detail.group_id)) {
    throw new Error("Invalid quiz creation event");
  }
  // Construct the SNS topic ARN for the group.
  const arn = topicArn(config, detail.group_id);
  // Retrieve the group details from the DynamoDB table.
  let Item;
  try {
    ({ Item } = await doc.send(new GetCommand({
      TableName: table.groups,
      Key: { id: detail.group_id },
      ConsistentRead: true,
      ProjectionExpression: "id, #name",
      ExpressionAttributeNames: { "#name": "name" },
    })));
  } catch {
    throw new Error("Could not retrieve group for notification");
  }
  // If the group does not exist, return early.
  if (!Item) return { status: "group-deleted" };
  // Validate that the group has a valid name.
  if (typeof Item.name !== "string" || !Item.name.trim()) {
    throw new Error("Group has no valid name");
  }

  // Publish a notification to the SNS topic for the group.
  let response;
  try {
    response = await sns.send(new PublishCommand({
      TopicArn: arn,
      Subject: "New quiz available",
      Message: `A new quiz is available in the group "${Item.name}". Sign in to view it.`,
    }));
  } catch {
    throw new Error("Quiz notification publish failed");
  }
  // Check that the SNS publish returned a message ID.
  if (!response.MessageId) throw new Error("SNS publish returned no message ID");
  return { status: "published" };
};
