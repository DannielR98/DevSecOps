/* import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, _res, next) => {
    req.user = { id: "1", email: "test@example.com" };
    next();
  },
}));

vi.mock("../../models/User.js", () => ({
  default: { findByPk: findOneUserMock, findOne: findOneUserMock },
}));

vi.mock("../../models/Group.js", () => ({
  default: { findByPk: findByPkGroupMock },
}));

vi.mock("../../models/Quiz.js", () => ({
  default: {
    findByPk: findByPkQuizMock,
    create: createQuizMock,
    sequelize: {
      transaction: vi.fn(async (cb) => cb({})),
    },
  },
}));

vi.mock("../../models/QuizResult.js", () => ({
  default: {
    destroy: destroyQuizResultMock,
    create: createQuizResultMock,
  },
}));

vi.mock("../../models/GroupMember.js", () => ({
  default: { findOne: findOneMemberMock },
}));

import createQuizRoute from "../../Api/Quizzes/createQuiz.js";
import getQuizByIdRoute from "../../Api/Quizzes/getQuizById.js";
import updateQuizRoute from "../../Api/Quizzes/updateQuiz.js";
import deleteQuizRoute from "../../Api/Quizzes/deleteQuiz.js";
import takeQuizRoute from "../../Api/Quizzes/takeQuiz.js";

const app = createTestApp(
  createQuizRoute,
  getQuizByIdRoute,
  updateQuizRoute,
  deleteQuizRoute,
  takeQuizRoute,
);

const VALID_GROUP_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("Quizzes CRUD & Submit Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/quizzes", () => {
    it("returns 400 when title, group_id, or questions are missing/invalid", async () => {
      const res = await request(app)
        .post("/api/quizzes")
        .send({ title: "Test Quiz" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 when user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/quizzes")
        .send({
          title: "Test Quiz",
          category: "DevSecOps",
          group_id: VALID_GROUP_UUID,
          questions: [
            { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
          ],
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("returns 404 when group is not found", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/quizzes")
        .send({
          title: "Test Quiz",
          category: "DevSecOps",
          group_id: VALID_GROUP_UUID,
          questions: [
            { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
          ],
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("returns 201 and creates quiz successfully", async () => {
      const createdQuiz = {
        id: "100",
        title: "Test Quiz",
        category: "DevSecOps",
        group_id: VALID_GROUP_UUID,
        creator_id: "1",
      };
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        name: "Dev Team",
      });
      findOneMemberMock.mockResolvedValue({
        id: "50",
        group_id: VALID_GROUP_UUID,
        user_id: "1",
      });
      createQuizMock.mockResolvedValue(createdQuiz);

      const res = await request(app)
        .post("/api/quizzes")
        .send({
          title: "Test Quiz",
          category: "DevSecOps",
          group_id: VALID_GROUP_UUID,
          questions: [
            { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.quiz).toEqual(createdQuiz);
      expect(createQuizMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Quiz",
          category: "DevSecOps",
          group_id: VALID_GROUP_UUID,
          creator_id: "1",
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
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue(null);

      const res = await request(app).get("/api/quizzes/5");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Quiz not found");
    });

    it("returns 403 when user is not a member of quiz group", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue({
        id: "5",
        group_id: VALID_GROUP_UUID,
      });
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "other-user",
      });
      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).get("/api/quizzes/5");

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You are not a member of this group");
    });

    it("returns 200 and quiz details when authorized", async () => {
      const quizObj = {
        id: "5",
        title: "DevSecOps Quiz",
        category: "General",
        group_id: VALID_GROUP_UUID,
        creator_id: "1",
        questions: [],
        createdAt: "2026-09-07T00:00:00.000Z",
      };
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue(quizObj);
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "1",
      });
      findOneMemberMock.mockResolvedValue({
        id: "50",
        group_id: VALID_GROUP_UUID,
        user_id: "1",
      });

      const res = await request(app).get("/api/quizzes/5");

      expect(res.status).toBe(200);
      expect(res.body.quiz).toEqual(quizObj);
    });
  });

  describe("PUT /api/quizzes/:id", () => {
    it("returns 404 when quiz is not found", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/quizzes/5")
        .send({
          title: "New Title",
          category: "General",
          questions: [
            { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
          ],
        });

      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not quiz creator", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue({
        id: "5",
        creator_id: "2",
        group_id: VALID_GROUP_UUID,
      });

      const res = await request(app)
        .put("/api/quizzes/5")
        .send({
          title: "New Title",
          category: "General",
          questions: [
            { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Only the quiz creator can update this quiz",
      );
    });

    it("returns 200 and updates quiz when authorized", async () => {
      const updateMock = vi.fn().mockResolvedValue(undefined);
      const quizObj = {
        id: "5",
        creator_id: "1",
        title: "Old Title",
        category: "General",
        group_id: VALID_GROUP_UUID,
        questions: [
          { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
        ],
        update: updateMock,
      };

      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue(quizObj);

      const res = await request(app)
        .put("/api/quizzes/5")
        .send({
          title: "Updated Title",
          category: "General",
          questions: [
            { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
          ],
        });

      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Updated Title" }),
      );
    });
  });

  describe("DELETE /api/quizzes/:id", () => {
    it("returns 403 when user is not creator", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue({ id: "5", creator_id: "2" });

      const res = await request(app).delete("/api/quizzes/5");

      expect(res.status).toBe(403);
    });

    it("returns 200, deletes results and destroys quiz", async () => {
      const destroyMock = vi.fn().mockResolvedValue(undefined);
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue({
        id: "5",
        creator_id: "1",
        destroy: destroyMock,
      });

      const res = await request(app).delete("/api/quizzes/5");

      expect(res.status).toBe(200);
      expect(destroyQuizResultMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { quiz_id: "5" } }),
      );
      expect(destroyMock).toHaveBeenCalledOnce();
    });
  });

  describe("POST /api/quizzes/:id/submit", () => {
    it("returns 400 when answers array is missing", async () => {
      const res = await request(app).post("/api/quizzes/5/submit").send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 when quiz is not found", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      findByPkQuizMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/quizzes/5/submit")
        .send({ answers: ["A"] });

      expect(res.status).toBe(404);
    });

    it("returns 201 and score when submitted", async () => {
      const quizObj = {
        id: "5",
        group_id: VALID_GROUP_UUID,
        questions: [
          { question: "Q1", options: ["A", "B"], correctAnswer: "B" },
          { question: "Q2", options: ["A", "B"], correctAnswer: "A" },
        ],
      };
      findByPkQuizMock.mockResolvedValue(quizObj);
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "1",
      });
      findOneMemberMock.mockResolvedValue({
        id: "50",
        group_id: VALID_GROUP_UUID,
        user_id: "1",
      });
      findOneUserMock.mockResolvedValue({ user_id: "1", id: "1" });
      createQuizResultMock.mockResolvedValue({
        id: "99",
        score: 2,
        total_questions: 2,
      });

      const res = await request(app)
        .post("/api/quizzes/5/submit")
        .send({ answers: ["B", "A"] });

      expect(res.status).toBe(201);
      expect(res.body.result).toEqual({
        id: "99",
        score: 2,
        total_questions: 2,
        percentage: 100,
      });
    });
  });
});
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// --------------------------------------------------
// MOCKS
// --------------------------------------------------

const {
  findOneUserMock,
  findByPkGroupMock,
  findAllGroupMock,
  findOneMemberMock,
  findByPkQuizMock,
  createQuizMock,
  destroyQuizResultMock,
  createQuizResultMock,
  transactionMock,
} = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findAllGroupMock: vi.fn(),
  findOneMemberMock: vi.fn(),
  findByPkQuizMock: vi.fn(),
  createQuizMock: vi.fn(),
  destroyQuizResultMock: vi.fn(),
  createQuizResultMock: vi.fn(),

  // Simulate Sequelize transaction
  transactionMock: vi.fn(async (callback) => {
    return callback({});
  }),
}));

vi.mock("../../middleware/supabaseAuth.js", () => ({
  checkJwt: (req, _res, next) => {
    req.auth = {
      payload: {
        sub: "supabase-auth-id",
        email: "test@example.com",
      },
    };
    next();
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findOne: findOneUserMock,
    findByPk: findOneUserMock,
  },
}));

vi.mock("../../models/Group.js", () => ({
  default: {
    findByPk: findByPkGroupMock,
    findAll: findAllGroupMock,
  },
}));

vi.mock("../../models/GroupMember.js", () => ({
  default: {
    findOne: findOneMemberMock,
  },
}));

vi.mock("../../models/Quiz.js", () => ({
  default: {
    findByPk: findByPkQuizMock,
    create: createQuizMock,

    sequelize: {
      transaction: transactionMock,
    },
  },
}));

vi.mock("../../models/QuizResult.js", () => ({
  default: {
    destroy: destroyQuizResultMock,
    create: createQuizResultMock,
  },
}));

// --------------------------------------------------
// ROUTES
// --------------------------------------------------

import createQuiz from "../../Api/Quizzes/createQuiz.js";
import getQuizById from "../../Api/Quizzes/getQuizById.js";
import updateQuiz from "../../Api/Quizzes/updateQuiz.js";
import deleteQuiz from "../../Api/Quizzes/deleteQuiz.js";
import takeQuiz from "../../Api/Quizzes/takeQuiz.js";

const app = createTestApp(
  createQuiz,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  takeQuiz,
);

// --------------------------------------------------
// TEST DATA
// --------------------------------------------------

const USER_UUID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
const OTHER_USER_UUID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
const GROUP_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const QUIZ_UUID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
const RESULT_UUID = "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";

const sampleQuestions = [
  {
    question: "What is 1 + 1?",
    options: ["1", "2"],
    correctAnswer: 1,
  },
  {
    question: "What is 2 + 2?",
    options: ["3", "4"],
    correctAnswer: 1,
  },
];

// --------------------------------------------------
// MOCK HELPERS
// --------------------------------------------------

const mockUser = (userId = USER_UUID) => {
  findOneUserMock.mockResolvedValue({
    user_id: userId,
    auth_id: "supabase-auth-id",
    email: "test@example.com",
  });
};

const mockGroup = () => {
  findAllGroupMock.mockResolvedValue([]);

  findByPkGroupMock.mockResolvedValue({
    id: GROUP_UUID,
    name: "Test Group",

    toJSON() {
      return {
        id: this.id,
        name: this.name,
      };
    },
  });

  findOneMemberMock.mockResolvedValue({
    id: RESULT_UUID,
    group_id: GROUP_UUID,
    user_id: USER_UUID,
  });
};

const makeQuiz = (overrides = {}) => ({
  id: QUIZ_UUID,
  title: "Test Quiz",
  category: "General",
  group_id: GROUP_UUID,
  creator_id: USER_UUID,
  questions: sampleQuestions,

  update: vi.fn(async function (data) {
    Object.assign(this, data);
    return this;
  }),

  destroy: vi.fn().mockResolvedValue(undefined),

  get: vi.fn(function ({ plain } = {}) {
    if (plain) {
      return {
        id: this.id,
        title: this.title,
        category: this.category,
        group_id: this.group_id,
        creator_id: this.creator_id,
        questions: this.questions,
      };
    }

    return this;
  }),

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      group_id: this.group_id,
      creator_id: this.creator_id,
      questions: this.questions,
    };
  },

  ...overrides,
});

// --------------------------------------------------
// RESET BEFORE EACH TEST
// --------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockUser();
  mockGroup();

  transactionMock.mockImplementation(async (callback) => {
    return callback({});
  });
});

// --------------------------------------------------
// CREATE QUIZ
// --------------------------------------------------

describe("POST /api/quizzes", () => {
  it("creates a quiz successfully", async () => {
    const createdQuiz = makeQuiz();

    createQuizMock.mockResolvedValue(createdQuiz);

    const res = await request(app).post("/api/quizzes").send({
      title: "Test Quiz",
      category: "General",
      group_id: GROUP_UUID,
      questions: sampleQuestions,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.quiz.id).toBe(QUIZ_UUID);

    expect(findOneUserMock).toHaveBeenCalled();
    expect(findAllGroupMock).toHaveBeenCalled();
    expect(findByPkGroupMock).toHaveBeenCalledWith(GROUP_UUID);

    expect(findOneMemberMock).toHaveBeenCalledWith({
      where: {
        group_id: GROUP_UUID,
        user_id: USER_UUID,
      },
    });

    expect(createQuizMock).toHaveBeenCalledWith({
      title: "Test Quiz",
      category: "General",
      group_id: GROUP_UUID,
      creator_id: USER_UUID,
      questions: sampleQuestions,
    });
  });

  it("returns 404 when the local user does not exist", async () => {
    findOneUserMock.mockResolvedValue(null);

    const res = await request(app).post("/api/quizzes").send({
      title: "Test Quiz",
      group_id: GROUP_UUID,
      questions: sampleQuestions,
    });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found in local database");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app).post("/api/quizzes").send({
      group_id: GROUP_UUID,
      questions: sampleQuestions,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_TITLE");
  });

  it("returns 400 when group_id is missing", async () => {
    const res = await request(app).post("/api/quizzes").send({
      title: "Test Quiz",
      questions: sampleQuestions,
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("GROUP_ID_MISSING");
  });

  it("returns 400 when questions are empty", async () => {
    const res = await request(app).post("/api/quizzes").send({
      title: "Test Quiz",
      group_id: GROUP_UUID,
      questions: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("QUESTIONS_REQUIRED");
  });

  it("returns 404 when the group does not exist", async () => {
    findByPkGroupMock.mockResolvedValue(null);

    const res = await request(app).post("/api/quizzes").send({
      title: "Test Quiz",
      group_id: GROUP_UUID,
      questions: sampleQuestions,
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("GROUP_NOT_FOUND");
  });

  it("returns 403 when the user is not a group member", async () => {
    findOneMemberMock.mockResolvedValue(null);

    const res = await request(app).post("/api/quizzes").send({
      title: "Test Quiz",
      group_id: GROUP_UUID,
      questions: sampleQuestions,
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("NOT_GROUP_MEMBER");
  });

  it("uses General when category is missing", async () => {
    createQuizMock.mockResolvedValue(makeQuiz());

    const res = await request(app).post("/api/quizzes").send({
      title: "Test Quiz",
      group_id: GROUP_UUID,
      questions: sampleQuestions,
    });

    expect(res.status).toBe(201);

    expect(createQuizMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "General",
      }),
    );
  });
});

// --------------------------------------------------
// GET QUIZ BY ID
// --------------------------------------------------

describe("GET /api/quizzes/:id", () => {
  it("returns quiz successfully", async () => {
    findByPkQuizMock.mockResolvedValue(makeQuiz());

    const res = await request(app).get(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(200);
  });

  it("returns 404 when quiz does not exist", async () => {
    findByPkQuizMock.mockResolvedValue(null);

    const res = await request(app).get(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(404);
  });

  it("returns 401 when local user does not exist", async () => {
    findOneUserMock.mockResolvedValue(null);

    const res = await request(app).get(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a group member", async () => {
    findByPkQuizMock.mockResolvedValue(makeQuiz());
    findOneMemberMock.mockResolvedValue(null);

    const res = await request(app).get(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(403);
  });
});

// --------------------------------------------------
// UPDATE QUIZ
// --------------------------------------------------

describe("PUT /api/quizzes/:id", () => {
  it("updates quiz successfully", async () => {
    const quiz = makeQuiz();

    findByPkQuizMock.mockResolvedValue(quiz);

    const res = await request(app).put(`/api/quizzes/${QUIZ_UUID}`).send({
      title: "Updated Quiz",
      category: "Science",
      questions: sampleQuestions,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quiz.title).toBe("Updated Quiz");

    expect(quiz.update).toHaveBeenCalledWith({
      title: "Updated Quiz",
      category: "Science",
      questions: sampleQuestions,
    });

    expect(quiz.get).toHaveBeenCalledWith({
      plain: true,
    });
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app).put("/api/quizzes/not-a-uuid").send({
      title: "Updated Quiz",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid quiz ID");
  });

  it("returns 401 when user does not exist", async () => {
    findOneUserMock.mockResolvedValue(null);

    const res = await request(app).put(`/api/quizzes/${QUIZ_UUID}`).send({
      title: "Updated Quiz",
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when quiz does not exist", async () => {
    findByPkQuizMock.mockResolvedValue(null);

    const res = await request(app).put(`/api/quizzes/${QUIZ_UUID}`).send({
      title: "Updated Quiz",
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the quiz creator", async () => {
    findByPkQuizMock.mockResolvedValue(
      makeQuiz({
        creator_id: OTHER_USER_UUID,
      }),
    );

    const res = await request(app).put(`/api/quizzes/${QUIZ_UUID}`).send({
      title: "Updated Quiz",
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 when no update fields are provided", async () => {
    findByPkQuizMock.mockResolvedValue(makeQuiz());

    const res = await request(app).put(`/api/quizzes/${QUIZ_UUID}`).send({});

    expect(res.status).toBe(400);
  });
});

// --------------------------------------------------
// DELETE QUIZ
// --------------------------------------------------

describe("DELETE /api/quizzes/:id", () => {
  it("deletes quiz successfully", async () => {
    const quiz = makeQuiz();

    findByPkQuizMock.mockResolvedValue(quiz);
    destroyQuizResultMock.mockResolvedValue(1);

    const res = await request(app).delete(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(200);

    expect(res.body).toEqual({
      success: true,
      message: "Quiz deleted successfully",
    });

    expect(transactionMock).toHaveBeenCalled();

    expect(destroyQuizResultMock).toHaveBeenCalledWith({
      where: {
        quiz_id: QUIZ_UUID,
      },
      transaction: expect.any(Object),
    });

    expect(quiz.destroy).toHaveBeenCalledWith({
      transaction: expect.any(Object),
    });
  });

  it("returns 400 when quiz UUID is invalid", async () => {
    const res = await request(app).delete("/api/quizzes/not-a-uuid");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid quiz ID");
  });

  it("returns 401 when user does not exist", async () => {
    findOneUserMock.mockResolvedValue(null);

    const res = await request(app).delete(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("User not found for this JWT");
  });

  it("returns 404 when quiz does not exist", async () => {
    findByPkQuizMock.mockResolvedValue(null);

    const res = await request(app).delete(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Quiz not found");
  });

  it("returns 403 when user is not quiz creator", async () => {
    findByPkQuizMock.mockResolvedValue(
      makeQuiz({
        creator_id: OTHER_USER_UUID,
      }),
    );

    const res = await request(app).delete(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Only the quiz creator can delete this quiz");

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 500 when deleting quiz results fails", async () => {
    findByPkQuizMock.mockResolvedValue(makeQuiz());

    destroyQuizResultMock.mockRejectedValue(
      new Error("Could not delete quiz results"),
    );

    const res = await request(app).delete(`/api/quizzes/${QUIZ_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Could not delete quiz");
  });
});

// --------------------------------------------------
// TAKE QUIZ
// --------------------------------------------------

describe("POST /api/quizzes/:id/submit", () => {
  it("returns 400 when answers are missing", async () => {
    const res = await request(app)
      .post(`/api/quizzes/${QUIZ_UUID}/submit`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 when quiz does not exist", async () => {
    findByPkQuizMock.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/quizzes/${QUIZ_UUID}/submit`)
      .send({
        answers: [1, 1],
      });

    expect(res.status).toBe(404);
  });

  it("submits quiz successfully", async () => {
    findByPkQuizMock.mockResolvedValue(makeQuiz());

    createQuizResultMock.mockResolvedValue({
      id: RESULT_UUID,
      score: 2,
      total_questions: 2,
      percentage: 100,
    });

    const res = await request(app)
      .post(`/api/quizzes/${QUIZ_UUID}/submit`)
      .send({
        answers: [1, 1],
      });

    expect(res.status).toBe(201);
  });
});
