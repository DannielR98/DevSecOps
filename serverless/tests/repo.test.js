import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/db.js", () => ({
  doc: { send },
  table: {
    users: "users",
    uniques: "uniques",
    groups: "groups",
    members: "members",
    quizzes: "quizzes",
    results: "results",
  },
}));

const { users, groups, quizzes } = await import("../src/lib/repo.js");

beforeEach(() => send.mockReset());

describe("DynamoDB repository", () => {
  it("reads every page of a user scan", async () => {
    const lastKey = { user_id: "first" };
    send.mockResolvedValueOnce({ Items: [{ user_id: "first" }], LastEvaluatedKey: lastKey })
      .mockResolvedValueOnce({ Items: [{ user_id: "second" }] });

    expect(await users.list()).toEqual([{ user_id: "first" }, { user_id: "second" }]);
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(["ScanCommand", "ScanCommand"]);
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual(lastKey);
  });

  it("reads every page of a group quiz query", async () => {
    const lastKey = { id: "first" };
    send.mockResolvedValueOnce({ Items: [{ id: "first" }], LastEvaluatedKey: lastKey })
      .mockResolvedValueOnce({ Items: [{ id: "second" }] });

    expect(await quizzes.listByGroup("group")).toEqual([{ id: "first" }, { id: "second" }]);
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: "quizzes",
      IndexName: "group_id-index",
      ScanIndexForward: false,
    });
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual(lastKey);
  });

  it("retries unprocessed batch reads and deduplicates IDs", async () => {
    send.mockResolvedValueOnce({
      Responses: { groups: [{ id: "one" }] },
      UnprocessedKeys: { groups: { Keys: [{ id: "two" }] } },
    }).mockResolvedValueOnce({ Responses: { groups: [{ id: "two" }] } });

    expect(await groups.getMany(["one", "two", "one"])).toEqual([{ id: "one" }, { id: "two" }]);
    expect(send.mock.calls[0][0].input.RequestItems.groups.Keys).toEqual([{ id: "one" }, { id: "two" }]);
    expect(send.mock.calls[1][0].input.RequestItems.groups.Keys).toEqual([{ id: "two" }]);
  });

  it("retries unprocessed batch deletes before deleting the quiz", async () => {
    const request = { DeleteRequest: { Key: { id: "result" } } };
    send.mockResolvedValueOnce({ Items: [{ id: "result" }] })
      .mockResolvedValueOnce({ UnprocessedItems: { results: [request] } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await quizzes.removeCascade({ id: "quiz" });
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual([
      "QueryCommand", "BatchWriteCommand", "BatchWriteCommand", "DeleteCommand",
    ]);
    expect(send.mock.calls[2][0].input.RequestItems.results).toEqual([request]);
    expect(send.mock.calls[3][0].input).toMatchObject({ TableName: "quizzes", Key: { id: "quiz" } });
  });

  it("maps transaction conflicts to 409 and propagates other database failures", async () => {
    const input = { auth_id: "auth", email: "a@example.com", username: "alice" };
    send.mockRejectedValueOnce(Object.assign(new Error("conflict"), { name: "TransactionCanceledException" }));
    await expect(users.create(input)).rejects.toMatchObject({ status: 409 });

    const failure = new Error("database unavailable");
    send.mockRejectedValueOnce(failure);
    await expect(users.create(input)).rejects.toBe(failure);
  });
});
