import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_GROUP_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const {
  createGroupMock,
  createMemberMock,
  findAllGroupMock,
  findByPkGroupMock,
  findAllMemberMock,
  findOneUserMock,
  destroyMemberMock,
  destroyQuizMock,
  findAllQuizMock,
  destroyQuizResultMock,
} = vi.hoisted(() => ({
  createGroupMock: vi.fn(),
  createMemberMock: vi.fn(),
  findAllGroupMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findAllMemberMock: vi.fn(),
  findOneUserMock: vi.fn(),
  destroyMemberMock: vi.fn(),
  destroyQuizMock: vi.fn(),
  findAllQuizMock: vi.fn().mockResolvedValue([]),
  destroyQuizResultMock: vi.fn(),
}));

vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
    req.user = { id: "user-1", email: "user@example.com" };
    next();
  },
}));

vi.mock("../../models/Group.js", () => ({
  default: {
    create: createGroupMock,
    findAll: findAllGroupMock,
    findByPk: findByPkGroupMock,
    findOne: vi.fn().mockResolvedValue(null),
    sequelize: {
      transaction: vi.fn(async (cb) => cb({})),
    },
  },
}));

vi.mock("../../models/GroupMember.js", () => ({
  default: {
    create: createMemberMock,
    findAll: findAllMemberMock,
    destroy: destroyMemberMock,
  },
}));

vi.mock("../../models/Quiz.js", () => ({
  default: {
    findAll: findAllQuizMock,
    destroy: destroyQuizMock,
  },
}));

vi.mock("../../models/QuizResult.js", () => ({
  default: {
    destroy: destroyQuizResultMock,
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findByPk: findOneUserMock,
    findOne: findOneUserMock,
  },
}));

import createGroupRoute from "../../Api/Groups/createGroup.js";
import getGroupsRoute from "../../Api/Groups/getGroups.js";
import getGroupByIdRoute from "../../Api/Groups/getGroupById.js";
import deleteGroupRoute from "../../Api/Groups/deleteGroup.js";

const app = createTestApp(
  createGroupRoute,
  getGroupsRoute,
  getGroupByIdRoute,
  deleteGroupRoute,
);

describe("Groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findAllQuizMock.mockResolvedValue([]);
  });

  it("returns 400 when name is missing or too short", async () => {
    const res = await request(app).post("/api/groups").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 500 when create fails inside transaction", async () => {
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    createGroupMock.mockRejectedValue(new Error("create failed"));

    const res = await request(app).post("/api/groups").send({
      name: "Dev Team",
    });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("returns 201 when a group is created", async () => {
    const newGroup = {
      id: VALID_GROUP_UUID,
      name: "Dev Team",
      invite_code: "ABC1234567",
      owner_id: "user-1",
      createdAt: new Date().toISOString(),
    };
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    createGroupMock.mockResolvedValue(newGroup);
    createMemberMock.mockResolvedValue(undefined);

    const res = await request(app).post("/api/groups").send({
      name: "Dev Team",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.group.name).toBe("Dev Team");
    expect(createMemberMock).toHaveBeenCalledOnce();
  });

  it("returns 500 when fetching fails", async () => {
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    findAllMemberMock.mockResolvedValue([]);
    findAllGroupMock.mockRejectedValue(new Error("findAll failed"));

    const res = await request(app).get("/api/groups");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("returns 200 when groups are fetched", async () => {
    const group = {
      id: VALID_GROUP_UUID,
      name: "Dev Team",
      invite_code: "ABC1234567",
      owner_id: "user-1",
      createdAt: "2026-09-06T00:00:00.000Z",
    };
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    findAllMemberMock.mockResolvedValue([{ group_id: VALID_GROUP_UUID }]);
    findAllGroupMock.mockResolvedValue([group]);

    const res = await request(app).get("/api/groups");

    expect(res.status).toBe(200);
    expect(res.body.groups).toEqual([
      {
        ...group,
        is_owner: true,
      },
    ]);
  });

  it("returns 200 when user has 0 group memberships", async () => {
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    findAllMemberMock.mockResolvedValue([]);
    findAllGroupMock.mockResolvedValue([]);

    const res = await request(app).get("/api/groups");

    expect(res.status).toBe(200);
    expect(res.body.groups).toEqual([]);
  });

  it("returns 400 when group ID is not a valid UUID format", async () => {
    const res = await request(app).get("/api/groups/invalid-id");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid group ID format");
  });

  it("returns 404 when group is missing", async () => {
    findByPkGroupMock.mockResolvedValue(null);

    const res = await request(app).get(`/api/groups/${VALID_GROUP_UUID}`);

    expect(res.status).toBe(404);
  });

  it("returns 500 when lookup fails", async () => {
    findByPkGroupMock.mockRejectedValue(new Error("lookup failed"));

    const res = await request(app).get(`/api/groups/${VALID_GROUP_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("returns 200 when a group is found", async () => {
    const group = {
      id: VALID_GROUP_UUID,
      name: "Dev Team",
      invite_code: "ABC1234567",
      owner_id: "user-1",
      createdAt: "2026-09-06T00:00:00.000Z",
    };
    findByPkGroupMock.mockResolvedValue(group);

    const res = await request(app).get(`/api/groups/${VALID_GROUP_UUID}`);

    expect(res.status).toBe(200);
    expect(res.body.group).toEqual(group);
  });

  it("returns 403 when user is not owner on delete", async () => {
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    findByPkGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID, owner_id: "user-2" });

    const res = await request(app).delete(`/api/groups/${VALID_GROUP_UUID}`);

    expect(res.status).toBe(403);
  });

  it("returns 500 when destroy fails", async () => {
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    const mockDestroy = vi.fn().mockRejectedValue(new Error("destroy failed"));
    findByPkGroupMock.mockResolvedValue({
      id: VALID_GROUP_UUID,
      owner_id: "user-1",
      destroy: mockDestroy,
    });

    const res = await request(app).delete(`/api/groups/${VALID_GROUP_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("returns 200 when a group is deleted", async () => {
    const group = {
      id: VALID_GROUP_UUID,
      owner_id: "user-1",
      destroy: vi.fn().mockResolvedValue(undefined),
    };
    findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
    findByPkGroupMock.mockResolvedValue(group);
    findAllQuizMock.mockResolvedValue([{ id: "quiz-1" }]);

    const res = await request(app).delete(`/api/groups/${VALID_GROUP_UUID}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(destroyQuizResultMock).toHaveBeenCalled();
    expect(destroyMemberMock).toHaveBeenCalled();
    expect(destroyQuizMock).toHaveBeenCalled();
    expect(group.destroy).toHaveBeenCalledOnce();
  });
});
