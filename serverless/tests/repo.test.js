import { beforeEach, describe, expect, it, vi } from "vitest";

// Script SDK responses directly to exercise pagination, retries and errors
// that the lifecycle test's in-memory stand-in does not simulate.
const send = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/db.js", () => ({
  doc: { send },
  table: {
    users: "users",
    uniques: "uniques",
    groups: "groups",
    members: "members",
    quizzes: "quizzes",
    outbox: "outbox",
    results: "results",
  },
}));

const { users, groups, quizzes } = await import("../src/lib/repo.js");

beforeEach(() => send.mockReset());

// Tests for the DynamoDB repository functions, including pagination, batch operations, and error handling.
describe("DynamoDB repository", () => {
  // Test that the handler atomically registers a quiz event without leaking its contents.
  it("atomically registers a quiz event without leaking its contents", async () => {
    send.mockResolvedValueOnce({});
    const quiz = await quizzes.create({
      group_id: "group", title: "private title",
      creator_id: "creator", questions: [{ correctAnswer: "secret" }],
    });
    const [command] = send.mock.calls[0];
    expect(command.constructor.name).toBe("TransactWriteCommand");
    const [quizPut, eventPut] = command.input.TransactItems.map((item) => item.Put);
    expect(quizPut).toMatchObject({ TableName: "quizzes", Item: quiz, ConditionExpression: "attribute_not_exists(id)" });
    expect(eventPut).toMatchObject({
      TableName: "outbox",
      ConditionExpression: "attribute_not_exists(id)",
      Item: { type: "QuizCreated", group_id: "group", quiz_id: quiz.id, createdAt: quiz.createdAt },
    });
    expect(Object.keys(eventPut.Item).sort()).toEqual(["createdAt", "group_id", "id", "quiz_id", "type"]);
  });

  // Test that quiz creation fails when the registration transaction fails.
  it("fails quiz creation when the registration transaction fails", async () => {
    const failure = new Error("transaction unavailable");
    send.mockRejectedValueOnce(failure);
    await expect(quizzes.create({ group_id: "group" })).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(1);
  });
  // Test that every page of a user scan is read.
  it("reads every page of a user scan", async () => {
    const lastKey = { user_id: "first" };
    send.mockResolvedValueOnce({ Items: [{ user_id: "first" }], LastEvaluatedKey: lastKey })
      .mockResolvedValueOnce({ Items: [{ user_id: "second" }] });

    expect(await users.list()).toEqual([{ user_id: "first" }, { user_id: "second" }]);
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(["ScanCommand", "ScanCommand"]);
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual(lastKey);
  });

  // Test that every page of a group quiz query is read.
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

  // Test that unprocessed batch reads are retried and IDs are deduplicated.
  it("retries unprocessed batch reads and deduplicates IDs", async () => {
    send.mockResolvedValueOnce({
      Responses: { groups: [{ id: "one" }] },
      UnprocessedKeys: { groups: { Keys: [{ id: "two" }] } },
    }).mockResolvedValueOnce({ Responses: { groups: [{ id: "two" }] } });

    expect(await groups.getMany(["one", "two", "one"])).toEqual([{ id: "one" }, { id: "two" }]);
    expect(send.mock.calls[0][0].input.RequestItems.groups.Keys).toEqual([{ id: "one" }, { id: "two" }]);
    expect(send.mock.calls[1][0].input.RequestItems.groups.Keys).toEqual([{ id: "two" }]);
  });

  // Test that unprocessed batch deletes are retried before deleting the quiz.
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

  // Test that transaction conflicts are mapped to 409 and other database failures are propagated.
  it("maps transaction conflicts to 409 and propagates other database failures", async () => {
    const input = { auth_id: "auth", email: "a@example.com", username: "alice" };
    send.mockRejectedValueOnce(Object.assign(new Error("conflict"), { name: "TransactionCanceledException" }));
    await expect(users.create(input)).rejects.toMatchObject({ status: 409 });

    const failure = new Error("database unavailable");
    send.mockRejectedValueOnce(failure);
    await expect(users.create(input)).rejects.toBe(failure);
  });
});
