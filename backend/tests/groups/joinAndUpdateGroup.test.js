import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const {
  findOneUserMock,
  findOneGroupMock,
  findByPkGroupMock,
  findOneMemberMock,
  createMemberMock,
} = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  findOneGroupMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findOneMemberMock: vi.fn(),
  createMemberMock: vi.fn(),
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
  default: {
    findOne: findOneGroupMock,
    findByPk: findByPkGroupMock,
  },
}));

vi.mock("../../database/schemas/groupMemberSchema.js", () => ({
  default: {
    findOne: findOneMemberMock,
    create: createMemberMock,
  },
}));

import joinGroupRoute from "../../Api/Routes/Groups/joinGroup.js";
import updateGroupRoute from "../../Api/Routes/Groups/updateGroup.js";

const app = createTestApp(joinGroupRoute, updateGroupRoute);

describe("Groups Join & Update Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/groups/join", () => {
    it("returns 400 when invite code is missing", async () => {
      const res = await request(app).post("/api/groups/join").send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 when user does not exist", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found.");
    });

    it("returns 404 when group is not found with invite code", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneGroupMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "INVALID" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Invalid invite code. Group not found.");
    });

    it("returns 400 when user is already a member", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneGroupMock.mockResolvedValue({ id: 10, name: "Test Team" });
      findOneMemberMock.mockResolvedValue({ id: 5, group_id: 10, user_id: 1 });

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("You are already a member of this group.");
    });

    it("returns 200 and joins group successfully", async () => {
      const group = { id: 10, name: "Test Team" };
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneGroupMock.mockResolvedValue(group);
      findOneMemberMock.mockResolvedValue(null);
      createMemberMock.mockResolvedValue({ id: 100, group_id: 10, user_id: 1 });

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(200);
      expect(res.body.group).toEqual(group);
      expect(createMemberMock).toHaveBeenCalledWith({
        group_id: 10,
        user_id: 1,
        role: "member",
      });
    });
  });

  describe("PUT /api/groups/:id", () => {
    it("returns 400 when group name is missing", async () => {
      const res = await request(app).put("/api/groups/10").send({ name: "" });
      expect(res.status).toBe(400);
    });

    it("returns 404 when group is missing", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).put("/api/groups/10").send({ name: "New Name" });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not group owner", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkGroupMock.mockResolvedValue({ id: 10, owner_id: 2 });

      const res = await request(app).put("/api/groups/10").send({ name: "New Name" });
      expect(res.status).toBe(403);
    });

    it("returns 200 and updates group name", async () => {
      const saveMock = vi.fn().mockResolvedValue(undefined);
      const group = { id: 10, owner_id: 1, name: "Old Name", save: saveMock };

      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkGroupMock.mockResolvedValue(group);

      const res = await request(app).put("/api/groups/10").send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(group.name).toBe("Updated Name");
      expect(saveMock).toHaveBeenCalledOnce();
    });
  });
});
