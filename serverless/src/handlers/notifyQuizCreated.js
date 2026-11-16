import { PublishCommand } from "@aws-sdk/client-sns";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { doc, table } from "../lib/db.js";
import { sns, topicArn, topicConfig, uuidPattern } from "../lib/notificationTopics.js";

export const handler = async (event) => {
  const config = topicConfig();
  if (!table.groups) throw new Error("Missing groups table configuration");
  const detail = event?.detail;
  if (event?.source !== "quiz.app" || event?.["detail-type"] !== "QuizCreated" ||
      !detail || typeof detail.event_id !== "string" || !uuidPattern.test(detail.event_id) ||
      typeof detail.quiz_id !== "string" || !uuidPattern.test(detail.quiz_id) ||
      typeof detail.group_id !== "string" || !uuidPattern.test(detail.group_id)) {
    throw new Error("Invalid quiz creation event");
  }
  const arn = topicArn(config, detail.group_id);
  const { Item } = await doc.send(new GetCommand({
    TableName: table.groups,
    Key: { id: detail.group_id },
    ConsistentRead: true,
    ProjectionExpression: "id, #name",
    ExpressionAttributeNames: { "#name": "name" },
  }));
  if (!Item) return { status: "group-deleted" };
  if (typeof Item.name !== "string" || !Item.name.trim()) {
    throw new Error("Group has no valid name");
  }

  const response = await sns.send(new PublishCommand({
    TopicArn: arn,
    Subject: "New quiz available",
    Message: `A new quiz is available in the group "${Item.name}". Sign in to view it.`,
  }));
  if (!response.MessageId) throw new Error("SNS publish returned no message ID");
  return { status: "published" };
};
