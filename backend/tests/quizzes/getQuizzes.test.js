import { beforeEach, describe, expect, it, vi } from "vitest";
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
