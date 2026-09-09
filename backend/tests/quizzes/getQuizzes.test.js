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

vi.mock("../../middleware/auth0.js", () => ({
  checkJwt: (req, res, next) => {
    req.auth = { payload: { sub: "auth0|atester-id" } };
    next();
  },
}));

vi.mock("../../database/schemas/userSchema.js", () => ({
  default: { findOne: findOneUserMock },
}));

vi.mock("../../database/schemas/groupMemberSchema.js", () => ({
  default: { findAll: findAllMemberMock },
}));

vi.mock("../../database/schemas/groupSchema.js", () => ({
  default: { findAll: findAllGroupMock },
}));

vi.mock("../../database/schemas/quizSchema.js", () => ({
  default: { findAll: findAllQuizMock },
}));

import getQuizzesRoute from "../../Api/Routes/Quizzes/getQuizzes.js";

const app = createTestApp(getQuizzesRoute);

describe("GET /api/quizzes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty quizzes array when user belongs to 0 groups", async () => {
    findOneUserMock.mockResolvedValue({ id: 99, auth0_id: "auth0|atester-id" });
    findAllMemberMock.mockResolvedValue([]);
    findAllGroupMock.mockResolvedValue([]);

    const res = await request(app).get("/api/quizzes");

    expect(res.status).toBe(200);
    expect(res.body.quizzes).toEqual([]);
    expect(findAllQuizMock).not.toHaveBeenCalled();
  });

  it("returns only quizzes for groups the user belongs to", async () => {
    findOneUserMock.mockResolvedValue({ id: 99, auth0_id: "auth0|atester-id" });
    findAllMemberMock.mockResolvedValue([{ group_id: 10 }]);
    findAllGroupMock.mockResolvedValue([{ id: 10, name: "Dev Team" }]);
    findAllQuizMock.mockResolvedValue([
      { id: 1, title: "Group 10 Quiz", group_id: 10 },
    ]);

    const res = await request(app).get("/api/quizzes");

    expect(res.status).toBe(200);
    expect(findAllQuizMock).toHaveBeenCalledWith({
      where: { group_id: [10] },
      order: [["createdAt", "DESC"]],
    });
    expect(res.body.quizzes).toEqual([
      { id: 1, title: "Group 10 Quiz", group_id: 10, group_name: "Dev Team", is_creator: false },
    ]);
  });
});
