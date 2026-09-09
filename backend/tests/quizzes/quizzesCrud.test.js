import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const {
  findOneUserMock,
  findByPkGroupMock,
  findByPkQuizMock,
  createQuizMock,
  destroyQuizResultMock,
  createQuizResultMock,
  findOneMemberMock,
} = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findByPkQuizMock: vi.fn(),
  createQuizMock: vi.fn(),
  destroyQuizResultMock: vi.fn(),
  createQuizResultMock: vi.fn(),
  findOneMemberMock: vi.fn(),
}));

vi.mock("../../middleware/auth0.js", () => ({
  checkJwt: (req, res, next) => {
    req.auth = { payload: { sub: "auth0|test-user" } };
    next();
  },
}));

vi.mock("../../database/schemas/userSchema.js", () => ({
  default: { findOne: findOneUserMock },
}));

vi.mock("../../database/schemas/groupSchema.js", () => ({
  default: { findByPk: findByPkGroupMock },
}));

vi.mock("../../database/schemas/quizSchema.js", () => ({
  default: {
    findByPk: findByPkQuizMock,
    create: createQuizMock,
  },
}));

vi.mock("../../database/schemas/quizResultSchema.js", () => ({
  default: {
    destroy: destroyQuizResultMock,
    create: createQuizResultMock,
  },
}));

vi.mock("../../database/schemas/groupMemberSchema.js", () => ({
  default: { findOne: findOneMemberMock },
}));

import createQuizRoute from "../../Api/Routes/Quizzes/createQuiz.js";
import getQuizByIdRoute from "../../Api/Routes/Quizzes/getQuizById.js";
import updateQuizRoute from "../../Api/Routes/Quizzes/updateQuiz.js";
import deleteQuizRoute from "../../Api/Routes/Quizzes/deleteQuiz.js";
import takeQuizRoute from "../../Api/Routes/Quizzes/takeQuiz.js";

const app = createTestApp(
  createQuizRoute,
  getQuizByIdRoute,
  updateQuizRoute,
  deleteQuizRoute,
  takeQuizRoute,
);

describe("Quizzes CRUD & Submit Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/quizzes", () => {
    it("returns 400 when title, group_id, or questions are missing", async () => {
      const res = await request(app).post("/api/quizzes").send({ title: "Test Quiz" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Title, group_id, and at least one question are required.");
    });

    it("returns 404 when user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).post("/api/quizzes").send({
        title: "Test Quiz",
        group_id: 10,
        questions: [{ question: "Q1", options: ["A", "B"], correctAnswer: 0 }],
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found in local database.");
    });

    it("returns 404 when group is not found", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).post("/api/quizzes").send({
        title: "Test Quiz",
        group_id: 10,
        questions: [{ question: "Q1", options: ["A", "B"], correctAnswer: 0 }],
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found.");
    });

    it("returns 201 and creates quiz successfully", async () => {
      const createdQuiz = { id: 100, title: "Test Quiz", group_id: 10, creator_id: 1 };
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkGroupMock.mockResolvedValue({ id: 10, name: "Dev Team" });
      createQuizMock.mockResolvedValue(createdQuiz);

      const res = await request(app).post("/api/quizzes").send({
        title: "Test Quiz",
        group_id: 10,
        questions: [{ question: "Q1", options: ["A", "B"], correctAnswer: 0 }],
      });

      expect(res.status).toBe(201);
      expect(res.body.quiz).toEqual(createdQuiz);
      expect(createQuizMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Quiz",
          group_id: 10,
          creator_id: 1,
        }),
      );
    });
  });

  describe("GET /api/quizzes/:id", () => {
    it("returns 404 when user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).get("/api/quizzes/5");

      expect(res.status).toBe(404);
    });

    it("returns 404 when quiz is not found", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue(null);

      const res = await request(app).get("/api/quizzes/5");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Quiz not found.");
    });

    it("returns 403 when user is not a member of quiz group", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue({ id: 5, group_id: 10 });
      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).get("/api/quizzes/5");

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You are not a member of this group.");
    });

    it("returns 200 and quiz details when authorized", async () => {
      const quizObj = {
        id: 5,
        title: "DevSecOps Quiz",
        category: "General",
        group_id: 10,
        creator_id: 1,
        questions: [],
        createdAt: "2026-09-07T00:00:00.000Z",
      };
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue(quizObj);
      findOneMemberMock.mockResolvedValue({ id: 50, group_id: 10, user_id: 1 });

      const res = await request(app).get("/api/quizzes/5");

      expect(res.status).toBe(200);
      expect(res.body.quiz).toEqual(quizObj);
    });
  });

  describe("PUT /api/quizzes/:id", () => {
    it("returns 404 when quiz is not found", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue(null);

      const res = await request(app).put("/api/quizzes/5").send({ title: "New Title" });

      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not quiz creator", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue({ id: 5, creator_id: 2 });

      const res = await request(app).put("/api/quizzes/5").send({ title: "New Title" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only the quiz creator can update this quiz.");
    });

    it("returns 200 and updates quiz when authorized", async () => {
      const updateMock = vi.fn().mockResolvedValue(undefined);
      const quizObj = { id: 5, creator_id: 1, title: "Old Title", update: updateMock };

      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue(quizObj);

      const res = await request(app).put("/api/quizzes/5").send({ title: "Updated Title" });

      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith({ title: "Updated Title" });
    });
  });

  describe("DELETE /api/quizzes/:id", () => {
    it("returns 403 when user is not creator", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue({ id: 5, creator_id: 2 });

      const res = await request(app).delete("/api/quizzes/5");

      expect(res.status).toBe(403);
    });

    it("returns 200, deletes results and destroys quiz", async () => {
      const destroyMock = vi.fn().mockResolvedValue(undefined);
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkQuizMock.mockResolvedValue({ id: 5, creator_id: 1, destroy: destroyMock });

      const res = await request(app).delete("/api/quizzes/5");

      expect(res.status).toBe(200);
      expect(destroyQuizResultMock).toHaveBeenCalledWith({ where: { quiz_id: "5" } });
      expect(destroyMock).toHaveBeenCalledOnce();
    });
  });

  describe("POST /api/quizzes/:id/submit", () => {
    it("returns 400 when answers array is missing", async () => {
      const res = await request(app).post("/api/quizzes/5/submit").send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 when quiz is not found", async () => {
      findByPkQuizMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/quizzes/5/submit")
        .send({ answers: [0] });

      expect(res.status).toBe(404);
    });

    it("returns 200 and score when submitted", async () => {
      const quizObj = {
        id: 5,
        questions: [
          { question: "Q1", correctAnswer: 1 },
          { question: "Q2", correctAnswer: 0 },
        ],
      };
      findByPkQuizMock.mockResolvedValue(quizObj);
      findOneUserMock.mockResolvedValue({ id: 1 });
      createQuizResultMock.mockResolvedValue({ id: 99, score: 2, total_questions: 2 });

      const res = await request(app)
        .post("/api/quizzes/5/submit")
        .send({ answers: [1, 0] });

      expect(res.status).toBe(200);
      expect(res.body.result).toEqual({
        id: 99,
        score: 2,
        total_questions: 2,
        percentage: 100,
      });
    });
  });
});
