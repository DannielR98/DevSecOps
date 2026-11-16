import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn(), sns: vi.fn() }));
vi.mock("../src/lib/notificationLock.js", () => ({
  withNotificationLock: (operation) => operation(),
}));
vi.mock("../src/lib/db.js", () => ({
  doc: { send: mocks.db },
  table: { groups: "groups", members: "members", users: "users" },
}));
vi.mock("@aws-sdk/client-sns", () => {
  class SNSClient { send(command) { return mocks.sns(command); } }
  class CreateTopicCommand { constructor(input) { this.input = input; } }
  class DeleteTopicCommand { constructor(input) { this.input = input; } }
  class ListSubscriptionsByTopicCommand { constructor(input) { this.input = input; } }
  class ListTopicsCommand { constructor(input) { this.input = input; } }
  class SubscribeCommand { constructor(input) { this.input = input; } }
  class UnsubscribeCommand { constructor(input) { this.input = input; } }
  class PublishCommand { constructor(input) { this.input = input; } }
  return {
    SNSClient, CreateTopicCommand, DeleteTopicCommand, ListSubscriptionsByTopicCommand,
    ListTopicsCommand, SubscribeCommand, UnsubscribeCommand, PublishCommand,
  };
});

const { handler: reconcile } = await import("../src/handlers/reconcileNotifications.js");
const { handler: notify } = await import("../src/handlers/notifyQuizCreated.js");
const { removeConfirmedGroupEmail } = await import("../src/lib/notificationTopics.js");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const prefix = "arn:aws:sns:eu-north-1:123456789012:quiz-stack-a-";
const arn = (n) => `${prefix}${id(n)}`;
const calls = (commandName) => mocks.sns.mock.calls
  .map(([command]) => command)
  .filter((command) => command.constructor.name === commandName);
const scanData = {
  groups: [{ id: id(1), owner_id: id(101) }],
  members: [
    { id: id(201), group_id: id(1), user_id: id(102) },
    { id: id(202), group_id: id(1), user_id: id(103) },
    { id: id(203), group_id: id(1), user_id: id(104) },
  ],
  users: [
    { user_id: id(101), email: "Owner@example.com" },
    { user_id: id(102), email: "pending@example.com" },
    { user_id: id(103), email: "new@example.com" },
  ],
};

// Tests for the notification topic reconciliation handler.
function dbWithScans(data = scanData) {
  mocks.db.mockImplementation(async (command) => {
    const { TableName, ExclusiveStartKey } = command.input;
    if (command.constructor.name === "GetCommand") {
      return { Item: data.groups.find((group) => group.id === command.input.Key.id) };
    }
    if (command.constructor.name !== "ScanCommand") throw new Error("Unexpected DB call");
    const rows = data[TableName];
    return ExclusiveStartKey
      ? { Items: rows.slice(1) }
      : { Items: rows.slice(0, 1), LastEvaluatedKey: { cursor: "next" } };
  });
}

// Reset mocks and environment variables before each test.
beforeEach(() => {
  mocks.db.mockReset();
  mocks.sns.mockReset();
  process.env.SNS_TOPIC_ARN_PREFIX = prefix;
});

// Tests for the notification topic reconciliation handler.
describe("notification topic reconciliation", () => {
  it("backfills owners and members, preserves pending, removes confirmed obsolete subscriptions, and deletes orphan topics", async () => {
    dbWithScans();
    // SNS pending email subscriptions cannot be unsubscribed; confirmed obsolete ones can.
    mocks.sns.mockImplementation(async (command) => {
      switch (command.constructor.name) {
        case "ListTopicsCommand":
          return command.input.NextToken
            ? { Topics: [{ TopicArn: arn(2) }, { TopicArn: `${prefix}not-a-uuid` }] }
            : { Topics: [{ TopicArn: arn(1) }, { TopicArn: "arn:aws:sns:eu-north-1:123456789012:other-topic" }], NextToken: "next" };
        case "CreateTopicCommand": return { TopicArn: arn(1) };
        case "ListSubscriptionsByTopicCommand":
          return command.input.NextToken
            ? {
              Subscriptions: [
                { Protocol: "email", Endpoint: "old@example.com", SubscriptionArn: `${arn(1)}:sub1` },
                { Protocol: "email", Endpoint: "departed@example.com", SubscriptionArn: `${arn(1)}:sub2` },
                { Protocol: "email", Endpoint: "stale@example.com", SubscriptionArn: "PendingConfirmation" },
              ]
            }
            : {
              Subscriptions: [
                { Protocol: "email", Endpoint: "owner@example.com", SubscriptionArn: `${arn(1)}:sub3` },
                { Protocol: "email", Endpoint: "pending@example.com", SubscriptionArn: "PendingConfirmation" },
              ], NextToken: "more"
            };
        case "SubscribeCommand": return { SubscriptionArn: "pending confirmation" };
        default: return {};
      }
    });

    await expect(reconcile()).resolves.toEqual({ groups: 1, managedTopics: 2 });
    expect(calls("SubscribeCommand").map((command) => command.input.Endpoint)).toEqual(["new@example.com"]);
    expect(calls("UnsubscribeCommand").map((command) => command.input.SubscriptionArn))
      .toEqual([`${arn(1)}:sub1`, `${arn(1)}:sub2`]);
    expect(calls("DeleteTopicCommand").map((command) => command.input.TopicArn)).toEqual([arn(2)]);
    expect(calls("ListSubscriptionsByTopicCommand")[1].input.NextToken).toBe("more");
    expect(calls("ListTopicsCommand")[1].input.NextToken).toBe("next");
    for (const name of ["groups", "members", "users"]) {
      const scans = mocks.db.mock.calls.map(([command]) => command)
        .filter((command) => command.constructor.name === "ScanCommand" && command.input.TableName === name);
      expect(scans).toHaveLength(2);
      expect(scans[0].input.ConsistentRead).toBe(true);
      expect(scans[1].input.ExclusiveStartKey).toEqual({ cursor: "next" });
    }
  });

  // Test that the handler correctly subscribes the creator and existing members when no subscriptions exist.
  it("subscribes creator and existing members when no subscriptions exist", async () => {
    dbWithScans();
    mocks.sns.mockImplementation(async (command) => {
      if (command.constructor.name === "CreateTopicCommand") return { TopicArn: arn(1) };
      if (command.constructor.name === "SubscribeCommand") return { SubscriptionArn: "pending confirmation" };
      return {};
    });
    await reconcile();
    expect(calls("SubscribeCommand").map((command) => command.input.Endpoint))
      .toEqual(["owner@example.com", "pending@example.com", "new@example.com"]);
  });

  // Test that the handler does not delete a newly created group topic missing from the scan snapshot.
  it("does not delete a newly created group topic missing from the scan snapshot", async () => {
    dbWithScans({ groups: [], members: [], users: [] });
    mocks.db.mockImplementation(async (command) =>
      command.constructor.name === "GetCommand" ? { Item: { id: id(2) } } : { Items: [] });
    mocks.sns.mockResolvedValue({ Topics: [{ TopicArn: arn(2) }] });
    await reconcile();
    expect(calls("DeleteTopicCommand")).toHaveLength(0);
  });

  // Test that the handler deletes a topic if its group disappears during creation.
  it("deletes a topic if its group disappears during creation", async () => {
    dbWithScans();
    let gets = 0;
    const original = mocks.db.getMockImplementation();
    mocks.db.mockImplementation(async (command) => {
      if (command.constructor.name === "GetCommand") return ++gets === 1 ? { Item: { id: id(1) } } : {};
      return original(command);
    });
    mocks.sns.mockImplementation(async (command) =>
      command.constructor.name === "CreateTopicCommand" ? { TopicArn: arn(1) } : {});
    await reconcile();
    expect(calls("DeleteTopicCommand")[0].input.TopicArn).toBe(arn(1));
    expect(calls("SubscribeCommand")).toHaveLength(0);
  });

  // Test that the handler fails safely on scan, invalid email, and SNS failures.
  it("fails safely on scan, invalid email, and SNS failures", async () => {
    mocks.db.mockRejectedValueOnce(new Error("scan failed"));
    mocks.sns.mockResolvedValue({});
    await expect(reconcile()).rejects.toThrow("scan failed");
    expect(calls("DeleteTopicCommand")).toHaveLength(0);

    mocks.db.mockReset();
    mocks.sns.mockClear();
    dbWithScans({ ...scanData, users: [{ user_id: id(101), email: "bad" }] });
    await expect(reconcile()).rejects.toThrow("failed for 1");
    expect(calls("CreateTopicCommand")).toHaveLength(0);

    mocks.db.mockReset();
    dbWithScans();
    mocks.sns.mockImplementation(async (command) => {
      if (command.constructor.name === "CreateTopicCommand") return { TopicArn: arn(1) };
      if (command.constructor.name === "SubscribeCommand") throw new Error("SNS failure");
      return {};
    });
    await expect(reconcile()).rejects.toThrow("failed for 1");
  });

  // Test that the handler rejects unexpected subscriptions and an unsafe prefix.
  it("rejects unexpected subscriptions and an unsafe prefix", async () => {
    dbWithScans();
    mocks.sns.mockImplementation(async (command) => {
      if (command.constructor.name === "CreateTopicCommand") return { TopicArn: arn(1) };
      if (command.constructor.name === "ListSubscriptionsByTopicCommand") {
        return { Subscriptions: [{ Protocol: "https", Endpoint: "url", SubscriptionArn: `${arn(1)}:sub` }] };
      }
      return {};
    });
    await expect(reconcile()).rejects.toThrow("failed for 1");
    expect(calls("UnsubscribeCommand")).toHaveLength(0);
    process.env.SNS_TOPIC_ARN_PREFIX = "arn:aws:sns:eu-north-1:123456789012:*";
    await expect(reconcile()).rejects.toThrow("Invalid SNS_TOPIC_ARN_PREFIX");
  });
});

// Tests for the quiz notifications handler.
describe("quiz notifications", () => {
  const event = {
    source: "quiz.app", "detail-type": "QuizCreated",
    detail: { event_id: id(10), quiz_id: id(11), group_id: id(1), title: "sensitive", answers: ["secret"] },
  };
  // Test that the handler publishes the current group name only to the existing group's topic.
  it("publishes the current group name only to the existing group's topic", async () => {
    mocks.db.mockResolvedValue({ Item: { id: id(1), name: "Quiz Team" } });
    mocks.sns.mockResolvedValue({ MessageId: "message" });
    await expect(notify(event)).resolves.toEqual({ status: "published" });
    const published = calls("PublishCommand")[0].input;
    expect(published).toEqual({
      TopicArn: arn(1),
      Subject: "New quiz available",
      Message: 'A new quiz is available in the group "Quiz Team". Sign in to view it.',
    });

    expect(JSON.stringify(published)).not.toContain("secret");
    expect(mocks.db.mock.calls[0][0].input.ConsistentRead).toBe(true);
    expect(mocks.db.mock.calls[0][0].input).toMatchObject({
      ProjectionExpression: "id, #name",
      ExpressionAttributeNames: { "#name": "name" },
    });
    expect(calls("CreateTopicCommand")).toHaveLength(0);
  });

  // Test that the handler fails for a missing or invalid group name without publishing.
  it("fails for a missing or invalid group name without publishing", async () => {
    for (const name of [undefined, "", "   ", 42]) {
      mocks.db.mockResolvedValueOnce({ Item: { id: id(1), name } });
      await expect(notify(event)).rejects.toThrow("Group has no valid name");
    }
    expect(mocks.sns).not.toHaveBeenCalled();
  });

  // Tests for confirmed subscription cleanup.
  describe("confirmed subscription cleanup", () => {
    // Test that the handler paginates, removes every matching confirmed subscription and reports pending.
    it("paginates, removes every matching confirmed subscription and reports pending", async () => {
      mocks.sns.mockImplementation(async (command) => {
        if (command.constructor.name === "ListSubscriptionsByTopicCommand") {
          return command.input.NextToken
            ? {
              Subscriptions: [
                { Protocol: "email", Endpoint: "ME@example.com", SubscriptionArn: `${arn(1)}:confirmed2` },
                { Protocol: "email", Endpoint: "me@example.com", SubscriptionArn: "PendingConfirmation" },
              ]
            }
            : {
              Subscriptions: [
                { Protocol: "email", Endpoint: "me@example.com", SubscriptionArn: `${arn(1)}:confirmed1` },
                { Protocol: "email", Endpoint: "other@example.com", SubscriptionArn: `${arn(1)}:other` },
              ], NextToken: "page2"
            };
        }
        return {};
      });
      await expect(removeConfirmedGroupEmail(id(1), "Me@example.com"))
        .resolves.toEqual({ removed: 2, pending: 1 });
      expect(calls("UnsubscribeCommand").map((command) => command.input.SubscriptionArn))
        .toEqual([`${arn(1)}:confirmed1`, `${arn(1)}:confirmed2`]);
      expect(calls("ListSubscriptionsByTopicCommand")[1].input.NextToken).toBe("page2");
    });

    // Test that the handler propagates unsubscribe failures, and accepts an already-deleted topic.
    it("propagates unsubscribe failures, and accepts an already-deleted topic", async () => {
      mocks.sns.mockImplementation(async (command) => {
        if (command.constructor.name === "ListSubscriptionsByTopicCommand") {
          return { Subscriptions: [{ Protocol: "email", Endpoint: "me@example.com", SubscriptionArn: `${arn(1)}:sub` }] };
        }
        throw new Error("failed unsubscribe");
      });
      await expect(removeConfirmedGroupEmail(id(1), "me@example.com")).rejects.toThrow("failed unsubscribe");
      mocks.sns.mockRejectedValueOnce(Object.assign(new Error("not found"), { name: "NotFoundException" }));
      await expect(removeConfirmedGroupEmail(id(1), "me@example.com")).resolves.toEqual({ removed: 0, pending: 0 });
    });
  });

  // Test that the handler skips deleted groups without creating or publishing a topic.
  it("skips deleted groups without creating or publishing a topic", async () => {
    mocks.db.mockResolvedValue({});
    await expect(notify(event)).resolves.toEqual({ status: "group-deleted" });
    expect(mocks.sns).not.toHaveBeenCalled();
  });

  // Test that the handler rejects invalid events and propagates SNS errors for retry.
  it("rejects invalid events and propagates SNS errors for retry", async () => {
    await expect(notify({ ...event, detail: { ...event.detail, group_id: "bad" } }))
      .rejects.toThrow("Invalid quiz creation event");
    expect(mocks.db).not.toHaveBeenCalled();
    mocks.db.mockResolvedValue({ Item: { id: id(1), name: "Quiz Team" } });
    mocks.sns.mockRejectedValueOnce(new Error("SNS unavailable")).mockResolvedValueOnce({});
    await expect(notify(event)).rejects.toThrow("SNS unavailable");
    await expect(notify(event)).rejects.toThrow("no message ID");
  });
});
