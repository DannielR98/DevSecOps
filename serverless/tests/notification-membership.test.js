import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocking dependencies for notification-aware membership cleanup and SNS interactions.
const mocks = vi.hoisted(() => ({ db: vi.fn(), sns: vi.fn(), remove: vi.fn() }));
vi.mock("../src/lib/db.js", () => ({
  doc: { send: mocks.db },
  table: { members: "members", groups: "groups" },
}));
vi.mock("../src/lib/notificationTopics.js", () => ({
  removeConfirmedGroupEmail: mocks.remove,
  sns: { send: mocks.sns },
  topicConfig: () => ({}),
  topicArn: (_, id) => `topic:${id}`,
}));

const { removeUserSubscriptions, removeMemberSubscription, removeGroupTopic } =
  await import("../src/lib/notificationMembership.js");

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

// Tests for notification-aware membership cleanup, ensuring proper handling of subscriptions and SNS interactions.
describe("subscription cleanup", () => {
  // Test that every page of membership data is scanned and owned/joined groups are deduplicated.
  it("scans every page consistently and deduplicates owned and joined groups", async () => {
    mocks.db.mockImplementation(async ({ input }) => {
      if (input.TableName === "members") {
        return input.ExclusiveStartKey
          ? { Items: [{ group_id: "group-b" }] }
          : { Items: [{ group_id: "group-a" }], LastEvaluatedKey: { id: "next" } };
      }
      return { Items: [{ id: "group-a" }, { id: "group-c" }] };
    });
    await removeUserSubscriptions({ user_id: "user", email: "old@example.com" });
    expect(mocks.remove.mock.calls).toEqual([
      ["group-a", "old@example.com"], ["group-b", "old@example.com"], ["group-c", "old@example.com"],
    ]);
    expect(mocks.db.mock.calls.every(([command]) => command.input.ConsistentRead)).toBe(true);
    expect(mocks.db.mock.calls[0][0].input.ExpressionAttributeValues).toEqual({ ":user": "user" });
  });

  // Test that cleanup failures are propagated and SNS is only bypassed in explicit local mode.
  it("propagates cleanup failures and only bypasses SNS in explicit local mode", async () => {
    mocks.remove.mockRejectedValueOnce(new Error("SNS failure"));
    await expect(removeMemberSubscription("group", "email")).rejects.toThrow("SNS failure");
    await removeGroupTopic("group");
    expect(mocks.sns.mock.calls[0][0].input.TopicArn).toBe("topic:group");
    vi.stubEnv("NOTIFICATIONS_DISABLED", "true");
    await removeMemberSubscription("group", "email");
    await removeUserSubscriptions({ user_id: "user", email: "email" });
    await removeGroupTopic("group");
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.sns).toHaveBeenCalledTimes(1);
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
