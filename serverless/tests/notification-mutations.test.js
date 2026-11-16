import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocking dependencies for notification-aware membership changes and user updates/deletions.
const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  lock: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  removeUser: vi.fn(),
  getGroup: vi.fn(),
  findMember: vi.fn(),
  removeMember: vi.fn(),
  removeMemberSubscription: vi.fn(),
  removeUserSubscriptions: vi.fn(),
}));
vi.mock("../src/lib/auth.js", () => ({ authenticate: mocks.authenticate }));
vi.mock("../src/lib/notificationLock.js", () => ({ withNotificationLock: mocks.lock }));
vi.mock("../src/lib/notificationMembership.js", () => ({
  removeMemberSubscription: mocks.removeMemberSubscription,
  removeUserSubscriptions: mocks.removeUserSubscriptions,
}));
vi.mock("../src/lib/repo.js", () => ({
  users: { get: mocks.getUser, update: mocks.updateUser, remove: mocks.removeUser },
  groups: { get: mocks.getGroup },
  groupMembers: { find: mocks.findMember, remove: mocks.removeMember },
}));

const { handler: leave } = await import("../src/handlers/leaveGroup.js");
const { handler: update } = await import("../src/handlers/updateUser.js");
const { handler: remove } = await import("../src/handlers/deleteUser.js");
const userId = "00000000-0000-4000-8000-000000000001";
const groupId = "00000000-0000-4000-8000-000000000002";
const user = { user_id: userId, email: "current@example.com" };
const event = (params, body) => ({
  pathParameters: params,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// Tests for notification-aware membership changes, ensuring proper cleanup of subscriptions under the lock mechanism.
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue({ ...user, email: "stale@example.com" });
  mocks.getUser.mockResolvedValue(user);
  mocks.lock.mockImplementation((operation) => operation());
  mocks.getGroup.mockResolvedValue({ id: groupId, owner_id: "another-user" });
  mocks.findMember.mockResolvedValue({ id: "membership" });
  mocks.removeMemberSubscription.mockResolvedValue();
  mocks.removeUserSubscriptions.mockResolvedValue();
  mocks.removeMember.mockResolvedValue();
  mocks.removeUser.mockResolvedValue();
  mocks.updateUser.mockResolvedValue({ ...user, email: "new@example.com" });
});

// Tests for notification-aware membership changes, ensuring proper cleanup of subscriptions under the lock mechanism.
describe("notification-aware membership changes", () => {
  // Test that leaving a group removes the current confirmed subscription before releasing the lock.
  it("removes the current confirmed subscription before leaving under the lock", async () => {
    const response = await leave(event({ groupId }));
    expect(response.statusCode).toBe(200);
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.removeMemberSubscription).toHaveBeenCalledWith(groupId, user.email);
    expect(mocks.removeMemberSubscription.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.removeMember.mock.invocationCallOrder[0]);
  });

  // Test that membership is not removed if SNS cleanup fails.
  it("does not remove membership if SNS cleanup fails", async () => {
    mocks.removeMemberSubscription.mockRejectedValue(new Error("SNS unavailable"));
    const response = await leave(event({ groupId }));
    expect(response.statusCode).toBe(500);
    expect(mocks.removeMember).not.toHaveBeenCalled();
  });

  // Test that old subscriptions are cleaned before changing the email or deleting a profile.
  it("cleans old subscriptions before changing the email or deleting a profile", async () => {
    expect((await update(event({ user_id: userId }, { email: "new@example.com" }))).statusCode).toBe(200);
    expect(mocks.removeUserSubscriptions).toHaveBeenCalledWith(user);
    expect(mocks.removeUserSubscriptions.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.updateUser.mock.invocationCallOrder[0]);
    mocks.removeUserSubscriptions.mockClear();
    expect((await remove(event({ user_id: userId }))).statusCode).toBe(200);
    expect(mocks.removeUserSubscriptions).toHaveBeenCalledWith(user);
    expect(mocks.removeUserSubscriptions.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.removeUser.mock.invocationCallOrder[0]);
  });

  // Test that the user is not changed or deleted when SNS cleanup fails.
  it("does not change or delete a user when SNS cleanup fails", async () => {
    mocks.removeUserSubscriptions.mockRejectedValue(new Error("SNS unavailable"));
    expect((await update(event({ user_id: userId }, { email: "new@example.com" }))).statusCode).toBe(500);
    expect((await remove(event({ user_id: userId }))).statusCode).toBe(500);
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.removeUser).not.toHaveBeenCalled();
  });
});
