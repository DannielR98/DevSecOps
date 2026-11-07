import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), users: vi.fn(), quiz: vi.fn(), group: vi.fn(), member: vi.fn(), results: vi.fn(),
}));
vi.mock("../../middleware/supabaseAuth.js", () => ({
  checkJwt: (req, res, next) => {
    if (!req.headers.authorization) { return res.status(401).json({ message: "Authorization required" }); }
    req.auth = { payload: { sub: "auth-user" } };
    next();
  },
}));
vi.mock("../../models/User.js", () => ({ default: { findOne: mocks.user, findAll: mocks.users } }));
vi.mock("../../models/Quiz.js", () => ({ default: { findByPk: mocks.quiz } }));
vi.mock("../../models/Group.js", () => ({ default: { findByPk: mocks.group } }));
vi.mock("../../models/GroupMember.js", () => ({ default: { findOne: mocks.member } }));
vi.mock("../../models/QuizResult.js", () => ({ default: { findAll: mocks.results } }));

import router from "../../Api/Quizzes/getQuizResults.js";
const app = createTestApp(router);
const quizId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const path = `/api/quizzes/${quizId}/results`;
const auth = (req) => req.set("Authorization", "Bearer test");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ user_id: "alice" });
  mocks.quiz.mockResolvedValue({ id: quizId, group_id: "group" });
  mocks.group.mockResolvedValue({ id: "group", owner_id: "alice" });
  mocks.member.mockResolvedValue(null);
  mocks.results.mockResolvedValue([]);
  mocks.users.mockResolvedValue([]);
});

describe("quiz results", () => {
  it("checks authentication, parameters, quiz existence and membership", async () => {
    expect((await request(app).get(`${path}?view=mine`)).status).toBe(401);
    expect((await auth(request(app).get("/api/quizzes/bad/results?view=mine"))).status).toBe(400);
    expect((await auth(request(app).get(path))).status).toBe(400);
    mocks.quiz.mockResolvedValueOnce(null);
    expect((await auth(request(app).get(`${path}?view=mine`))).status).toBe(404);
    mocks.group.mockResolvedValueOnce({ owner_id: "someone-else" });
    expect((await auth(request(app).get(`${path}?view=leaderboard`))).status).toBe(403);
    expect(mocks.results).not.toHaveBeenCalled();
  });

  it("returns only the caller's ordered attempts", async () => {
    mocks.results.mockResolvedValue([
      { id: "b", user_id: "alice", score: 2, total_questions: 2, createdAt: "2026-01-02T00:00:00Z" },
      { id: "a", user_id: "alice", score: 1, total_questions: 2, createdAt: "2026-01-01T00:00:00Z" },
    ]);
    const response = await auth(request(app).get(`${path}?view=mine`));
    expect(response.status).toBe(200);
    expect(mocks.results).toHaveBeenCalledWith({ where: { quiz_id: quizId, user_id: "alice" }, raw: true });
    expect(response.body.results.map((r) => r.percentage)).toEqual([50, 100]);
    expect(response.body.results[0]).not.toHaveProperty("user_id");
  });

  it("returns empty results and reports database errors", async () => {
    expect((await auth(request(app).get(`${path}?view=mine`))).body.results).toEqual([]);
    expect((await auth(request(app).get(`${path}?view=leaderboard`))).body.results).toEqual([]);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.results.mockRejectedValueOnce(new Error("database failure"));
    const response = await auth(request(app).get(`${path}?view=mine`));
    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Could not fetch quiz results");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("returns one best percentage per participant to a group member", async () => {
    mocks.group.mockResolvedValue({ owner_id: "another-user" });
    mocks.member.mockResolvedValue({ user_id: "alice" });
    mocks.results.mockResolvedValue([
      { id: "a", user_id: "alice", score: 2, total_questions: 4, createdAt: "2026-01-01" },
      { id: "b", user_id: "alice", score: 2, total_questions: 3, createdAt: "2026-01-02" },
      { id: "c", user_id: "bob", score: 3, total_questions: 4, createdAt: "2026-01-03" },
      { id: "d", user_id: "alice", score: 0, total_questions: 2, createdAt: "2026-01-04" },
    ]);
    mocks.users.mockResolvedValue([{ user_id: "alice", username: "Alice" }, { user_id: "bob", username: "Bob" }]);
    const response = await auth(request(app).get(`${path}?view=leaderboard`));
    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([
      { user_id: "bob", username: "Bob", score: 3, total_questions: 4, percentage: 75, attempt_count: 1 },
      { user_id: "alice", username: "Alice", score: 2, total_questions: 3, percentage: 67, attempt_count: 3 },
    ]);
    expect(mocks.results).toHaveBeenCalledWith({ where: { quiz_id: quizId }, raw: true });
  });

  it("uses unrounded percentages and selects the earliest attempt when tied", async () => {
    mocks.results.mockResolvedValue([
      { id: "c", user_id: "alice", score: 2, total_questions: 3, createdAt: "2026-01-03" },
      { id: "b", user_id: "alice", score: 4, total_questions: 6, createdAt: "2026-01-01" },
      { id: "a", user_id: "alice", score: 2, total_questions: 3, createdAt: "2026-01-01" },
      { id: "d", user_id: "bob", score: 67, total_questions: 100, createdAt: "2026-01-02" },
    ]);
    mocks.users.mockResolvedValue([{ user_id: "alice", username: "Alice" }, { user_id: "bob", username: "Bob" }]);
    const response = await auth(request(app).get(`${path}?view=leaderboard`));
    expect(response.body.results).toEqual([
      { user_id: "bob", username: "Bob", score: 67, total_questions: 100, percentage: 67, attempt_count: 1 },
      { user_id: "alice", username: "Alice", score: 2, total_questions: 3, percentage: 67, attempt_count: 3 },
    ]);
  });

  it("denies both views to non-members before querying results", async () => {
    mocks.group.mockResolvedValue({ owner_id: "another-user" });
    for (const view of ["mine", "leaderboard"]) {
      expect((await auth(request(app).get(`${path}?view=${view}`))).status).toBe(403);
    }
    expect(mocks.results).not.toHaveBeenCalled();
  });

  it("returns 401 for a missing profile and 404 for a missing group", async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await auth(request(app).get(`${path}?view=mine`))).status).toBe(401);
    mocks.group.mockResolvedValueOnce(null);
    expect((await auth(request(app).get(`${path}?view=mine`))).status).toBe(404);
    expect(mocks.results).not.toHaveBeenCalled();
  });
});
