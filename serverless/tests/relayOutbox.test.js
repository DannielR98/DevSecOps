import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the handler with scripted SDK responses, not live AWS services.
const mocks = vi.hoisted(() => ({ db: vi.fn(), events: vi.fn() }));
vi.mock("../src/lib/db.js", () => ({
  doc: { send: mocks.db },
  table: { outbox: "outbox" },
}));
vi.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: class {
    send(command) { return mocks.events(command); }
  },
  PutEventsCommand: class {
    constructor(input) { this.input = input; }
  },
}));

const { handler } = await import("../src/handlers/relayOutbox.js");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const item = (n) => ({
  id: id(n),
  type: "QuizCreated",
  quiz_id: id(n + 100),
  group_id: id(999),
  createdAt: "2026-01-02T03:04:05.000Z",
  title: "sensitive title",
  questions: [{ correctAnswer: "secret" }],
  token: "secret-token",
});
const ok = (count) => ({
  FailedEntryCount: 0,
  Entries: Array.from({ length: count }, (_, n) => ({ EventId: `aws-${n}` })),
});

beforeEach(() => {
  mocks.db.mockReset();
  mocks.events.mockReset();
  process.env.EVENT_BUS_NAME = "quiz-events";
});
// Tests for the relayOutbox handler.
describe("outbox relay", () => {
  // Test that the handler correctly scans multiple pages and batches events to EventBridge.
  it("scans every page, batches at ten, emits only safe fields and deletes successes", async () => {
    const first = Array.from({ length: 11 }, (_, n) => item(n + 1));
    const key = { id: id(11) };
    mocks.db.mockImplementation(async (command) => {
      if (command.constructor.name === "ScanCommand") {
        return command.input.ExclusiveStartKey ? { Items: [item(12)] } : { Items: first, LastEvaluatedKey: key };
      }
      return {};
    });
    mocks.events.mockImplementation(async (command) => ok(command.input.Entries.length));

    expect(await handler()).toEqual({ scanned: 12 });
    expect(mocks.events.mock.calls.map(([command]) => command.input.Entries.length)).toEqual([10, 1, 1]);
    const event = mocks.events.mock.calls[0][0].input.Entries[0];
    expect(event).toMatchObject({ Source: "quiz.app", DetailType: "QuizCreated", EventBusName: "quiz-events" });
    expect(JSON.parse(event.Detail)).toEqual({
      event_id: id(1), quiz_id: id(101), group_id: id(999), createdAt: "2026-01-02T03:04:05.000Z",
    });
    expect(JSON.stringify(event)).not.toContain("secret");
    const scans = mocks.db.mock.calls.filter(([command]) => command.constructor.name === "ScanCommand");
    expect(scans[0][0].input.ConsistentRead).toBe(true);
    expect(scans[1][0].input.ExclusiveStartKey).toEqual(key);
    const deletes = mocks.db.mock.calls.filter(([command]) => command.constructor.name === "DeleteCommand");
    expect(deletes).toHaveLength(12);
    expect(deletes[0][0].input).toMatchObject({
      TableName: "outbox",
      Key: { id: id(1) },
      ConditionExpression: expect.stringContaining("quiz_id = :quiz"),
    });
  });

  // Test that the handler correctly handles partial failures and retries with the same event id.
  it("retains partial failures and retries with the same event id", async () => {
    let remaining = [item(1), item(2)];
    mocks.db.mockImplementation(async (command) => {
      if (command.constructor.name === "ScanCommand") return { Items: remaining };
      remaining = remaining.filter((row) => row.id !== command.input.Key.id);
      return {};
    });
    mocks.events.mockResolvedValueOnce({
      FailedEntryCount: 1,
      Entries: [{ EventId: "accepted" }, { ErrorCode: "InternalFailure" }],
    }).mockResolvedValueOnce(ok(1));

    await expect(handler()).rejects.toThrow("left 1 record");
    expect(remaining.map((row) => row.id)).toEqual([id(2)]);
    await expect(handler()).resolves.toEqual({ scanned: 1 });
    const first = JSON.parse(mocks.events.mock.calls[0][0].input.Entries[1].Detail);
    const retry = JSON.parse(mocks.events.mock.calls[1][0].input.Entries[0].Detail);
    expect(retry).toEqual(first);
    expect(remaining).toEqual([]);
  });

  // Test that the handler correctly handles partial failures and retries with the same event id.
  it("retains records on an ambiguous publish response or exception", async () => {
    mocks.db.mockResolvedValue({ Items: [item(1)] });
    mocks.events.mockResolvedValueOnce({ FailedEntryCount: 0, Entries: [] })
      .mockResolvedValueOnce({ FailedEntryCount: 0, Entries: [null] })
      .mockRejectedValueOnce(new Error("network"));
    await expect(handler()).rejects.toThrow("left 1 record");
    await expect(handler()).rejects.toThrow("left 1 record");
    await expect(handler()).rejects.toThrow("left 1 record");
    expect(mocks.db.mock.calls.every(([command]) => command.constructor.name === "ScanCommand")).toBe(true);
  });

  // Test that the handler correctly handles a successfully published record that fails to delete.
  it("retains a successfully published record if deletion fails, allowing duplicate delivery", async () => {
    mocks.db.mockImplementation(async (command) => {
      if (command.constructor.name === "ScanCommand") return { Items: [item(1)] };
      throw new Error("DynamoDB unavailable");
    });
    mocks.events.mockResolvedValue(ok(1));
    await expect(handler()).rejects.toThrow("left 1 record");
    await expect(handler()).rejects.toThrow("left 1 record");
    expect(mocks.events.mock.calls[0][0].input.Entries[0].Detail)
      .toEqual(mocks.events.mock.calls[1][0].input.Entries[0].Detail);
  });

  // Test that malformed records are retained without publishing their content.
  it("retains malformed records without publishing their content and continues", async () => {
    mocks.db.mockImplementation(async (command) =>
      command.constructor.name === "ScanCommand"
        ? { Items: [{ ...item(1), group_id: "secret-token" }, item(2)] } : {});
    mocks.events.mockResolvedValue(ok(1));
    await expect(handler()).rejects.toThrow("left 1 record");
    expect(mocks.events.mock.calls[0][0].input.Entries).toHaveLength(1);
    expect(mocks.db.mock.calls.filter(([command]) => command.constructor.name === "DeleteCommand")).toHaveLength(1);
  });

  // Test that the handler correctly handles a low remaining time scenario and preserves the next-page cursor.
  it("accepts a recovery cursor and rejects invalid cursors or missing configuration", async () => {
    mocks.db.mockResolvedValue({ Items: [] });
    await handler({ startKey: { id: id(4) } });
    expect(mocks.db.mock.calls[0][0].input.ExclusiveStartKey).toEqual({ id: id(4) });
    await expect(handler({ startKey: { id: "bad" } })).rejects.toThrow("Invalid startKey");
    delete process.env.EVENT_BUS_NAME;
    await expect(handler()).rejects.toThrow("required");
  });

  // Test that the next-page cursor is preserved when time is low.
  it("preserves the next-page cursor when time is low", async () => {
    const remaining = vi.fn().mockReturnValueOnce(30000).mockReturnValueOnce(10000);
    mocks.db.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { id: id(1) } });
    await expect(handler({}, { getRemainingTimeInMillis: remaining })).rejects.toThrow(id(1));
    expect(mocks.db).toHaveBeenCalledTimes(1);
  });

  // Test that SDK errors and untrusted record fields are not exposed in logs.
  it("does not expose SDK errors or untrusted record fields", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => { });
    try {
      mocks.db.mockRejectedValueOnce(new Error("private scan token"));
      await expect(handler()).rejects.toThrow("Outbox scan failed");
      mocks.db.mockResolvedValueOnce({ Items: [{ id: "private identifier" }, item(1)] });
      mocks.events.mockResolvedValueOnce({
        FailedEntryCount: 1, Entries: [{ ErrorCode: "private error code" }],
      });
      await expect(handler()).rejects.toThrow("left 2 record");
      mocks.db.mockResolvedValueOnce({ Items: [item(1)] });
      mocks.events.mockRejectedValueOnce(new Error("private publish details"));
      await expect(handler()).rejects.toThrow("left 1 record");
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/private/);
    } finally {
      log.mockRestore();
    }
  });
});
