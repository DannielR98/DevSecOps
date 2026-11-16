import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

describe("notification infrastructure", () => {
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
    expect(resources.NotificationFailureAlarm.Properties.Threshold).toBe(1);
  });
});
