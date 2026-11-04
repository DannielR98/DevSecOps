import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_GROUP_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

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

vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, _res, next) => {
    req.user = { id: "user-1", email: "user@example.com" };
    next();
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findByPk: findOneUserMock,
    findOne: findOneUserMock,
  },
}));

vi.mock("../../models/Group.js", () => ({
  default: {
    findOne: findOneGroupMock,
    findByPk: findByPkGroupMock,
  },
}));

vi.mock("../../models/GroupMember.js", () => ({
  default: {
    findOne: findOneMemberMock,
    create: createMemberMock,
  },
}));

import joinGroupRoute from "../../Api/Groups/joinGroup.js";
import updateGroupRoute from "../../Api/Groups/updateGroup.js";

const app = createTestApp(joinGroupRoute, updateGroupRoute);

describe("Groups Join & Update Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/groups/join", () => {
    it("returns 400 when invite code is missing", async () => {
      const res = await request(app).post("/api/groups/join").send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 when user does not exist", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("returns 404 when group is not found with invite code", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findOneGroupMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "INVALID" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Invalid invite code. Group not found");
    });

    it("returns 409 when user is already a member", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findOneGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        name: "Test Team",
      });
      findOneMemberMock.mockResolvedValue({
        id: "5",
        group_id: VALID_GROUP_UUID,
        user_id: "user-1",
      });

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("You are already a member of this group");
    });

    it("returns 200 and joins group successfully", async () => {
      const group = {
        id: VALID_GROUP_UUID,
        name: "Test Team",
        invite_code: "CODE123",
        owner_id: "owner-id",
        createdAt: new Date().toISOString(),
      };
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findOneGroupMock.mockResolvedValue(group);
      findOneMemberMock.mockResolvedValue(null);
      createMemberMock.mockResolvedValue({
        id: "100",
        group_id: VALID_GROUP_UUID,
        user_id: "user-1",
      });

      const res = await request(app)
        .post("/api/groups/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.group.id).toBe(VALID_GROUP_UUID);
      expect(createMemberMock).toHaveBeenCalledWith({
        group_id: VALID_GROUP_UUID,
        user_id: "user-1",
        role: "member",
      });
    });
  });

  describe("PUT /api/groups/:id", () => {
    it("returns 400 when group ID is not a valid UUID format", async () => {
      const res = await request(app)
        .put("/api/groups/invalid-id")
        .send({ name: "Valid Name" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid group ID format");
    });

    it("returns 400 when group name is missing or too short", async () => {
      const res = await request(app)
        .put(`/api/groups/${VALID_GROUP_UUID}`)
        .send({ name: "" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 when group is missing", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app)
        .put(`/api/groups/${VALID_GROUP_UUID}`)
        .send({ name: "New Name" });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not group owner", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "user-2",
      });

      const res = await request(app)
        .put(`/api/groups/${VALID_GROUP_UUID}`)
        .send({ name: "New Name" });
      expect(res.status).toBe(403);
    });

    it("returns 200 and updates group name", async () => {
      const saveMock = vi.fn().mockResolvedValue(undefined);
      const group = {
        id: VALID_GROUP_UUID,
        owner_id: "user-1",
        name: "Old Name",
        invite_code: "CODE123",
        createdAt: "2026-09-06T00:00:00.000Z",
        save: saveMock,
      };

      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue(group);

      const res = await request(app)
        .put(`/api/groups/${VALID_GROUP_UUID}`)
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(group.name).toBe("Updated Name");
      expect(saveMock).toHaveBeenCalledOnce();
    });
  });
});
