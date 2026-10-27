import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_GROUP_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_MEMBER_UUID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

const {
  findOneUserMock,
  findOneGroupMock,
  findByPkGroupMock,
  findAllMemberMock,
  findOneMemberMock,
  createMemberMock,
} = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  findOneGroupMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findAllMemberMock: vi.fn(),
  findOneMemberMock: vi.fn(),
  createMemberMock: vi.fn(),
}));

vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
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
    findAll: findAllMemberMock,
    findOne: findOneMemberMock,
    create: createMemberMock,
  },
}));

import getGroupMembersRoute from "../../Api/GroupMember/getGroupMembers.js";
import getGroupMemberByIdRoute from "../../Api/GroupMember/getGroupMemberById.js";
import joinGroupMemberRoute from "../../Api/GroupMember/joinGroup.js";
import leaveGroupRoute from "../../Api/GroupMember/leaveGroup.js";

const app = createTestApp(
  getGroupMembersRoute,
  getGroupMemberByIdRoute,
  joinGroupMemberRoute,
  leaveGroupRoute,
);

describe("GroupMember Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/groups/:groupId/members", () => {
    it("returns 400 when group ID is invalid UUID", async () => {
      const res = await request(app).get("/api/groups/invalid-id/members");
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid group ID format");
    });

    it("returns 404 when group is not found", async () => {
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).get(`/api/groups/${VALID_GROUP_UUID}/members`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("returns 200 and list of group members", async () => {
      const membersList = [
        { id: VALID_MEMBER_UUID, group_id: VALID_GROUP_UUID, user_id: "user-1", role: "owner" },
      ];
      findByPkGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID });
      findAllMemberMock.mockResolvedValue(membersList);

      const res = await request(app).get(`/api/groups/${VALID_GROUP_UUID}/members`);

      expect(res.status).toBe(200);
      expect(res.body.members).toEqual(membersList);
    });
  });

  describe("GET /api/groups/:groupId/members/:memberId", () => {
    it("returns 404 when user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("returns 404 when group is not found", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("returns 403 when current user is not member of group", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID });
      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You are not a member of this group");
    });

    it("returns 200 and member details when authorized", async () => {
      const memberObj = {
        id: VALID_MEMBER_UUID,
        group_id: VALID_GROUP_UUID,
        user_id: "user-1",
        role: "owner",
        createdAt: "2026-09-06T00:00:00.000Z",
      };
      findOneUserMock
        .mockResolvedValueOnce({ user_id: "user-1", id: "user-1" }) // for auth check
        .mockResolvedValueOnce({
          user_id: "user-1",
          firstname: "Test",
          surname: "User",
          username: "testuser",
          email: "user@example.com",
        }); // for memberUser lookup

      findByPkGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID });
      // First findOne for currentMembership check, second findOne for member lookup
      findOneMemberMock
        .mockResolvedValueOnce({ id: VALID_MEMBER_UUID, group_id: VALID_GROUP_UUID, user_id: "user-1" })
        .mockResolvedValueOnce(memberObj);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.member.id).toBe(VALID_MEMBER_UUID);
      expect(res.body.member.role).toBe("owner");
    });
  });

  describe("POST /api/group-members/join", () => {
    it("returns 400 when invite code is missing", async () => {
      const res = await request(app).post("/api/group-members/join").send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invite code is required");
    });

    it("returns 404 when group is not found with invite code", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findOneGroupMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/group-members/join")
        .send({ invite_code: "INVALID" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Invalid invite code");
    });

    it("returns 409 when user is already a member", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findOneGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID });
      findOneMemberMock.mockResolvedValue({ id: VALID_MEMBER_UUID });

      const res = await request(app)
        .post("/api/group-members/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("You are already a member of this group");
    });

    it("returns 201 and joins group successfully", async () => {
      const createdMember = {
        id: VALID_MEMBER_UUID,
        group_id: VALID_GROUP_UUID,
        user_id: "user-1",
        role: "member",
        createdAt: new Date().toISOString(),
      };
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findOneGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID });
      findOneMemberMock.mockResolvedValue(null);
      createMemberMock.mockResolvedValue(createdMember);

      const res = await request(app)
        .post("/api/group-members/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(201);
      expect(res.body.member.id).toBe(VALID_MEMBER_UUID);
      expect(res.body.member.role).toBe("member");
    });
  });

  describe("DELETE /api/groups/:groupId/members/leave", () => {
    it("returns 400 when group owner attempts to leave", async () => {
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID, owner_id: "user-1" });

      const res = await request(app).delete(
        `/api/groups/${VALID_GROUP_UUID}/members/leave`,
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Group owner cannot leave");
    });

    it("returns 200 when normal member leaves group successfully", async () => {
      const destroyMock = vi.fn().mockResolvedValue(undefined);
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID, owner_id: "owner-id" });
      findOneMemberMock.mockResolvedValue({
        id: VALID_MEMBER_UUID,
        group_id: VALID_GROUP_UUID,
        user_id: "user-1",
        destroy: destroyMock,
      });

      const res = await request(app).delete(
        `/api/groups/${VALID_GROUP_UUID}/members/leave`,
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("You left the group successfully");
      expect(destroyMock).toHaveBeenCalledOnce();
    });
  });
});
