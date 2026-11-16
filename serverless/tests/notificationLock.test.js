import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/db.js", () => ({ doc: { send } }));
const { withNotificationLock } = await import("../src/lib/notificationLock.js");
const { HttpError } = await import("../src/lib/errors.js");

beforeEach(() => {
  send.mockReset();
  process.env.NOTIFICATION_LOCK_TABLE = "notification-locks";
  delete process.env.NOTIFICATIONS_DISABLED;
});

// Tests for the notification lock mechanism, including acquisition, release, and error handling.
describe("notification lock", () => {
  // Test that a durable global lock is acquired and released correctly, ensuring only the owner can release it.
  it("conditionally acquires a durable global lock and releases only its owner", async () => {
    send.mockResolvedValue({});
    const callback = vi.fn(async () => "result");
    await expect(withNotificationLock(callback)).resolves.toBe("result");
    expect(send).toHaveBeenCalledTimes(2);
    const [put, del] = send.mock.calls.map(([command]) => command);
    expect(put.constructor.name).toBe("PutCommand");
    expect(put.input).toMatchObject({
      TableName: "notification-locks",
      Item: { id: "notifications", owner: expect.any(String), acquiredAt: expect.any(String) },
      ConditionExpression: "attribute_not_exists(id)",
    });
    expect(Object.keys(put.input.Item).sort()).toEqual(["acquiredAt", "id", "owner"]);
    expect(del.constructor.name).toBe("DeleteCommand");
    expect(del.input).toEqual({
      TableName: "notification-locks",
      Key: { id: "notifications" },
      ConditionExpression: "#owner = :owner",
      ExpressionAttributeNames: { "#owner": "owner" },
      ExpressionAttributeValues: { ":owner": put.input.Item.owner },
    });
    expect(send.mock.invocationCallOrder[0]).toBeLessThan(callback.mock.invocationCallOrder[0]);
    expect(callback.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[1]);
  });

  // Test that an explicit 503 is returned for lock contention and that the callback is never called or the lock released.
  it("returns an explicit 503 for contention and never calls the callback or releases", async () => {
    send.mockRejectedValue(Object.assign(new Error("locked"), { name: "ConditionalCheckFailedException" }));
    const callback = vi.fn();
    const error = await withNotificationLock(callback).catch((failure) => failure);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 503, message: expect.stringContaining("locked") });
    expect(callback).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  // Test that the owned lock is released and a callback failure is propagated.
  it("releases the owned lock and propagates a callback failure", async () => {
    send.mockResolvedValue({});
    const failure = new Error("operation failed");
    await expect(withNotificationLock(async () => { throw failure; })).rejects.toBe(failure);
    expect(send.mock.calls[1][0].constructor.name).toBe("DeleteCommand");
  });

  // Test that an undefined thrown by the callback is not suppressed and the lock is released.
  it("does not suppress an undefined thrown by the callback", async () => {
    send.mockResolvedValue({});
    const outcome = await withNotificationLock(async () => { throw undefined; })
      .then(() => "resolved", () => "rejected");
    expect(outcome).toBe("rejected");
    expect(send.mock.calls[1][0].constructor.name).toBe("DeleteCommand");
  });

  // Test that the mechanism fails closed on release failure, both after a successful callback and after a callback failure.
  it("fails closed on release failure after success and after callback failure", async () => {
    const release = new Error("DynamoDB unavailable");
    send.mockResolvedValueOnce({}).mockRejectedValueOnce(release);
    await expect(withNotificationLock(async () => "success"))
      .rejects.toMatchObject({ message: expect.stringContaining("manual recovery"), cause: release });
    const failure = new Error("callback failure");
    send.mockResolvedValueOnce({}).mockRejectedValueOnce(release);
    await expect(withNotificationLock(async () => { throw failure; }))
      .rejects.toMatchObject({ cause: release, operationError: failure });
    expect(send).toHaveBeenCalledTimes(4);
  });

  // Test that ambiguous acquisition errors fail closed without deleting a potentially owned lock.
  it("fails closed on ambiguous acquisition errors without deleting a potentially owned lock", async () => {
    const failure = new Error("timeout");
    send.mockRejectedValue(failure);
    const callback = vi.fn();
    await expect(withNotificationLock(callback))
      .rejects.toMatchObject({ message: expect.stringContaining("operator recovery"), cause: failure });
    expect(callback).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  // Test that the lock mechanism requires configuration and does not infer a disabled state.
  it("requires configuration and does not infer a disabled state", async () => {
    delete process.env.NOTIFICATION_LOCK_TABLE;
    const callback = vi.fn();
    await expect(withNotificationLock(callback)).rejects.toThrow("NOTIFICATION_LOCK_TABLE is required");
    process.env.NOTIFICATIONS_DISABLED = "false";
    await expect(withNotificationLock(callback)).rejects.toThrow("NOTIFICATION_LOCK_TABLE is required");
    expect(callback).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  // Test that the lock is only bypassed when notifications are explicitly disabled.
  it("only bypasses the lock for explicitly disabled notifications", async () => {
    delete process.env.NOTIFICATION_LOCK_TABLE;
    process.env.NOTIFICATIONS_DISABLED = "true";
    await expect(withNotificationLock(async () => "local")).resolves.toBe("local");
    expect(send).not.toHaveBeenCalled();
    const failure = new Error("local failure");
    await expect(withNotificationLock(async () => { throw failure; })).rejects.toBe(failure);
  });
});
