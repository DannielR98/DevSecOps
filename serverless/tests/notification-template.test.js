import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

// Tests for the notification infrastructure template, ensuring correct wiring of resources and failure paths.
describe("notification infrastructure", () => {
  // Test that the notification infrastructure template correctly wires durable event relay, reconciliation, delivery, and both failure paths.
  it("wires durable event relay, reconciliation, delivery and both failure paths", () => {
    const doc = parseDocument(readFileSync("template.yaml", "utf8"));
    expect(doc.errors).toEqual([]);
    const resources = doc.toJS().Resources;
    expect(resources.OutboxTable.Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled).toBe(true);
    expect(resources.NotificationLockTable.Properties.KeySchema[0].AttributeName).toBe("id");
    expect(resources.OutboxSchedule.Properties.ScheduleExpression).toBe("rate(1 minute)");
    expect(resources.ReconciliationSchedule.Properties.ScheduleExpression).toBe("rate(5 minutes)");
    expect(resources.QuizCreatedRule.Properties.EventPattern).toEqual({
      source: ["quiz.app"], "detail-type": ["QuizCreated"],
    });
    for (const name of ["OutboxSchedule", "ReconciliationSchedule", "QuizCreatedRule"]) {
      expect(resources[name].Properties.Targets[0].DeadLetterConfig).toBeDefined();
    }
    for (const name of ["OutboxRelayFunction", "ReconcileNotificationsFunction", "NotifyQuizCreatedFunction"]) {
      expect(resources[name].Properties.EventInvokeConfig.DestinationConfig.OnFailure.Type).toBe("SQS");
    }
    expect(resources.NotificationFailureQueue.Properties.MessageRetentionPeriod).toBe(1209600);
    expect(resources.NotificationFailureQueue.Properties.SqsManagedSseEnabled).toBe(true);
    expect(resources.NotificationFailureAlarm.Properties.Threshold).toBe(1);
    expect(resources.OperationsAlarmTopic.Type).toBe("AWS::SNS::Topic");
    const key = resources.OperationsAlarmKey;
    expect(key.Type).toBe("AWS::KMS::Key");
    expect(key.DeletionPolicy).toBe("Retain");
    expect(key.UpdateReplacePolicy).toBe("Retain");
    expect(key.Properties.EnableKeyRotation).toBe(true);
    expect(key.Properties.KeyPolicy.Statement).toEqual(expect.arrayContaining([
      expect.objectContaining({
        Sid: "AllowCloudWatchAlarms",
        Effect: "Allow",
        Principal: { Service: "cloudwatch.amazonaws.com" },
        Action: ["kms:Decrypt", "kms:GenerateDataKey*"],
        Resource: "*",
      }),
    ]));
    const encryptionKey = doc.getIn(["Resources", "OperationsAlarmTopic", "Properties", "KmsMasterKeyId"], true);
    expect(encryptionKey).toMatchObject({ tag: "!GetAtt", value: "OperationsAlarmKey.Arn" });
    const alarm = resources.NotificationFailureAlarm;
    expect(alarm.DependsOn).toBe("OperationsAlarmTopicPolicy");
    const action = doc.getIn(["Resources", "NotificationFailureAlarm", "Properties", "AlarmActions", 0], true);
    expect(action).toMatchObject({ tag: "!Ref", value: "OperationsAlarmTopic" });
    const output = doc.getIn(["Outputs", "OperationsAlarmTopicArn", "Value"], true);
    expect(output).toMatchObject({ tag: "!Ref", value: "OperationsAlarmTopic" });
    const policy = resources.OperationsAlarmTopicPolicy.Properties.PolicyDocument.Statement;
    expect(policy[1]).toMatchObject({
      Principal: { Service: "cloudwatch.amazonaws.com" },
      Action: "sns:Publish",
    });
    const sourceArn = doc.getIn([
      "Resources", "OperationsAlarmTopicPolicy", "Properties", "PolicyDocument",
      "Statement", 1, "Condition", "ArnEquals", "aws:SourceArn",
    ], true);
    const alarmName = doc.getIn(["Resources", "NotificationFailureAlarm", "Properties", "AlarmName"], true);
    expect(sourceArn.value).toBe(`arn:\${AWS::Partition}:cloudwatch:\${AWS::Region}:\${AWS::AccountId}:alarm:${alarmName.value}`);
  });
});
