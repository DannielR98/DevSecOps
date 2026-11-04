/* import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const {
  findOneUserMock,
  findAllMemberMock,
  findAllGroupMock,
  findAllQuizMock,
} = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  findAllMemberMock: vi.fn(),
  findAllGroupMock: vi.fn(),
  findAllQuizMock: vi.fn(),
}));

vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
    req.user = { id: "99", email: "test@example.com" };
    next();
  },
}));

vi.mock("../../models/User.js", () => ({
  default: { findByPk: findOneUserMock, findOne: findOneUserMock },
}));

vi.mock("../../models/GroupMember.js", () => ({
  default: { findAll: findAllMemberMock },
}));

vi.mock("../../models/Group.js", () => ({
  default: { findAll: findAllGroupMock, findByPk: vi.fn() },
}));

vi.mock("../../models/Quiz.js", () => ({
  default: { findAll: findAllQuizMock },
}));

import getQuizzesRoute from "../../Api/Quizzes/getQuizzes.js";

const app = createTestApp(getQuizzesRoute);

describe("GET /api/quizzes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty quizzes array when user belongs to 0 groups", async () => {
    findOneUserMock.mockResolvedValue({ user_id: "99", id: "99" });
    findAllMemberMock.mockResolvedValue([]);
    findAllGroupMock.mockResolvedValue([]);

    const res = await request(app).get("/api/quizzes");

    expect(res.status).toBe(200);
    expect(res.body.quizzes).toEqual([]);
    expect(findAllQuizMock).not.toHaveBeenCalled();
  });

  it("returns only quizzes for groups the user belongs to", async () => {
    findOneUserMock.mockResolvedValue({ user_id: "99", id: "99" });
    findAllMemberMock.mockResolvedValue([{ group_id: "10" }]);
    findAllGroupMock.mockResolvedValue([{ id: "10", name: "Dev Team" }]);
    findAllQuizMock.mockResolvedValue([
      {
        id: "1",
        title: "Group 10 Quiz",
        group_id: "10",
        creator_id: "other-user",
        get: vi.fn(function () {
          return {
            id: this.id,
            title: this.title,
            group_id: this.group_id,
            creator_id: this.creator_id,
          };
        }),
      },
    ]);

    const res = await request(app).get("/api/quizzes");

    expect(res.status).toBe(200);
    expect(res.body.quizzes).toEqual([
      {
        id: "1",
        title: "Group 10 Quiz",
        group_id: "10",
        creator_id: "other-user",
        group_name: "Dev Team",
        is_creator: false,
      },
    ]);
  });
});
 */



import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ---------------- MOCKS ----------------

const {
  findOneUserMock,
  findAllGroupMemberMock,
  findAllGroupMock,
  findByPkGroupMock,
  findAllQuizMock,
  checkJwtMock,
} = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  findAllGroupMemberMock: vi.fn(),
  findAllGroupMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findAllQuizMock: vi.fn(),
  checkJwtMock: vi.fn((req, res, next) => {
    if (req.headers["x-no-auth"] === "true") {
      req.auth = {};
    } else {
      req.auth = {
        payload: {
          sub: "auth-user-1",
          email: "test@example.com",
        },
      };
    }

    next();
  }),
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findOne: findOneUserMock,
  },
}));

vi.mock("../../models/GroupMember.js", () => ({
  default: {
    findAll: findAllGroupMemberMock,
  },
}));

vi.mock("../../models/Group.js", () => ({
  default: {
    findAll: findAllGroupMock,
    findByPk: findByPkGroupMock,
  },
}));

vi.mock("../../models/Quiz.js", () => ({
  default: {
    findAll: findAllQuizMock,
  },
}));

vi.mock("../../middleware/supabaseAuth.js", () => ({
  checkJwt: checkJwtMock,
}));

// ---------------- ROUTE ----------------

import getQuizzesRoute from "../../Api/Quizzes/getQuizzes.js";

import express from "express";

const app = express();
app.use(express.json());
app.use("/api", getQuizzesRoute);

// ---------------- TEST DATA ----------------

const userId = "11111111-1111-4111-8111-111111111111";

const groupId = "22222222-2222-4222-8222-222222222222";
const secondGroupId = "33333333-3333-4333-8333-333333333333";
const inaccessibleGroupId = "44444444-4444-4444-8444-444444444444";

const quizId = "55555555-5555-4555-8555-555555555555";

const mockUser = {
  user_id: userId,
};

const mockQuiz = {
  id: quizId,
  group_id: groupId,
  creator_id: userId,
  title: "JavaScript Quiz",
  category: "Programming",
  questions: [],
  createdAt: new Date("2026-01-01"),
  get: vi.fn(() => ({
    id: quizId,
    group_id: groupId,
    creator_id: userId,
    title: "JavaScript Quiz",
    category: "Programming",
    questions: [],
  })),
};

// ---------------- RESET ----------------

beforeEach(() => {
  vi.clearAllMocks();

  findOneUserMock.mockResolvedValue(mockUser);

  findAllGroupMemberMock.mockResolvedValue([
    { group_id: groupId },
  ]);

  // Reset queued responses as well as call history
  findAllGroupMock.mockReset();

  findAllGroupMock
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        id: groupId,
        name: "Test Group",
      },
    ]);

  findByPkGroupMock.mockResolvedValue({
    id: groupId,
    name: "Test Group",
  });

  findAllQuizMock.mockResolvedValue([mockQuiz]);
});

// ---------------- TESTS ----------------

describe("GET /api/quizzes", () => {
  it("should return quizzes for the authenticated user's groups", async () => {
    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.quizzes).toHaveLength(1);

    expect(response.body.quizzes[0]).toMatchObject({
      id: quizId,
      group_id: groupId,
      creator_id: userId,
      title: "JavaScript Quiz",
      group_name: "Test Group",
      is_creator: true,
    });

    expect(findOneUserMock).toHaveBeenCalled();
    expect(findAllGroupMemberMock).toHaveBeenCalled();
    expect(findAllQuizMock).toHaveBeenCalled();
  });

  it("should return 401 when authentication information is missing", async () => {
    const response = await request(app)
      .get("/api/quizzes")
      .set("x-no-auth", "true");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message:
        "Authenticated user information is missing from the token",
    });

    expect(findOneUserMock).not.toHaveBeenCalled();
  });

  it("should return 401 when the local user does not exist", async () => {
    findOneUserMock.mockResolvedValue(null);

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "User not found for this JWT",
    });
  });

  it("should return 500 when the local user ID is missing", async () => {
    findOneUserMock.mockResolvedValue({
      user_id: null,
    });

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Local user ID is missing",
    });
  });

  it("should return an empty list when the user has no accessible groups", async () => {
    findAllGroupMemberMock.mockResolvedValue([]);

    findAllGroupMock.mockReset();
    findAllGroupMock.mockResolvedValueOnce([]);

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      count: 0,
      quizzes: [],
    });

    expect(findAllQuizMock).not.toHaveBeenCalled();
  });

  it("should include groups owned by the user", async () => {
    findAllGroupMemberMock.mockResolvedValue([]);

    findAllGroupMock.mockReset();

    findAllGroupMock
      .mockResolvedValueOnce([
        {
          id: groupId,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: groupId,
          name: "Owned Group",
        },
      ]);

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.quizzes).toHaveLength(1);
    expect(response.body.quizzes[0].group_name).toBe("Owned Group");
  });

  it("should remove duplicate group IDs from membership and ownership", async () => {
    findAllGroupMemberMock.mockResolvedValue([
      { group_id: groupId },
    ]);

    findAllGroupMock.mockReset();

    findAllGroupMock
      .mockResolvedValueOnce([
        { id: groupId },
      ])
      .mockResolvedValueOnce([
        {
          id: groupId,
          name: "Test Group",
        },
      ]);

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const quizQuery = findAllQuizMock.mock.calls[0][0];
    const inOperator = Object.getOwnPropertySymbols(
      quizQuery.where.group_id,
    )[0];

    expect(quizQuery.where.group_id[inOperator]).toEqual([groupId]);
  });

  it("should return 400 when group_id is not a valid UUID", async () => {
    const response = await request(app)
      .get("/api/quizzes")
      .query({ group_id: "invalid-id" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "A valid group_id is required",
    });

    expect(findByPkGroupMock).not.toHaveBeenCalled();
  });

  it("should return 404 when the requested group does not exist", async () => {
    findByPkGroupMock.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/quizzes")
      .query({ group_id: inaccessibleGroupId });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Group not found",
    });
  });

  it("should return 403 when the user does not have access to the requested group", async () => {
    findByPkGroupMock.mockResolvedValue({
      id: inaccessibleGroupId,
      name: "Other Group",
    });

    const response = await request(app)
      .get("/api/quizzes")
      .query({ group_id: inaccessibleGroupId });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "You do not have access to this group's quizzes",
    });

    expect(findAllQuizMock).not.toHaveBeenCalled();
  });

  it("should return quizzes for the requested group only", async () => {
    const response = await request(app)
      .get("/api/quizzes")
      .query({ group_id: groupId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(findByPkGroupMock).toHaveBeenCalledWith(groupId);
    expect(findAllQuizMock).toHaveBeenCalled();
    expect(response.body.quizzes).toHaveLength(1);
  });

  it("should set is_creator to false when another user created the quiz", async () => {
    const otherCreatorId =
      "99999999-9999-4999-8999-999999999999";

    const otherUserQuiz = {
      id: quizId,
      group_id: groupId,
      creator_id: otherCreatorId,
      get: vi.fn(() => ({
        id: quizId,
        group_id: groupId,
        creator_id: otherCreatorId,
        title: "JavaScript Quiz",
        category: "Programming",
        questions: [],
      })),
    };

    findAllQuizMock.mockResolvedValue([otherUserQuiz]);

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(200);
    expect(response.body.quizzes[0].is_creator).toBe(false);
  });

  it("should use 'Okänd grupp' when a group name is not found", async () => {
    findAllGroupMock.mockReset();

    findAllGroupMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.quizzes).toHaveLength(1);
    expect(response.body.quizzes[0].group_name).toBe("Okänd grupp");
  });

  it("should return 500 when a database query fails", async () => {
    findAllGroupMemberMock.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await request(app).get("/api/quizzes");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Could not fetch quizzes",
    });
  });
});
