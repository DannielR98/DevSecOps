/* import { beforeEach, describe, expect, it, vi } from "vitest";
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

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("returns 200 and list of group members", async () => {
      const membersList = [
        {
          id: VALID_MEMBER_UUID,
          group_id: VALID_GROUP_UUID,
          user_id: "user-1",
          role: "owner",
        },
      ];
      findByPkGroupMock.mockResolvedValue({ id: VALID_GROUP_UUID });
      findAllMemberMock.mockResolvedValue(membersList);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members`,
      );

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
        .mockResolvedValueOnce({
          id: VALID_MEMBER_UUID,
          group_id: VALID_GROUP_UUID,
          user_id: "user-1",
        })
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
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "user-1",
      });

      const res = await request(app).delete(
        `/api/groups/${VALID_GROUP_UUID}/members/leave`,
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Group owner cannot leave");
    });

    it("returns 200 when normal member leaves group successfully", async () => {
      const destroyMock = vi.fn().mockResolvedValue(undefined);
      findOneUserMock.mockResolvedValue({ user_id: "user-1", id: "user-1" });
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "owner-id",
      });
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
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_GROUP_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_MEMBER_UUID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

const {
  findOneUserMock,
  findByPkUserMock,
  findOneGroupMock,
  findByPkGroupMock,
  findAllMemberMock,
  findOneMemberMock,
  createMemberMock,
} = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  findByPkUserMock: vi.fn(),
  findOneGroupMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findAllMemberMock: vi.fn(),
  findOneMemberMock: vi.fn(),
  createMemberMock: vi.fn(),
}));

const authenticatedUser = {
  user_id: "user-1",
  id: "user-1",
  auth_id: "supabase-auth-id",
  email: "user@example.com",
};

vi.mock("../../middleware/supabaseAuth.js", () => ({
  checkJwt: (req, res, next) => {
    req.auth = {
      payload: {
        sub: "supabase-auth-id",
        email: "user@example.com",
      },
    };

    req.user = {
      id: "user-1",
      email: "user@example.com",
    };

    next();
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findOne: findOneUserMock,
    findByPk: findByPkUserMock,
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

    // Default authenticated local user
    findOneUserMock.mockResolvedValue(authenticatedUser);
  });

  const mockAuthenticatedUser = () => {
    findOneUserMock.mockResolvedValue(authenticatedUser);
  };

  describe("GET /api/groups/:groupId/members", () => {
    it("returns 400 when group ID is invalid UUID", async () => {
      const res = await request(app).get("/api/groups/invalid-id/members");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid group ID format");
    });

    it("returns 401 when authenticated user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members`,
      );

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("User not found for this JWT");
    });

    it("returns 500 when local user ID is missing", async () => {
      findOneUserMock.mockResolvedValue({
        auth_id: "supabase-auth-id",
        email: "user@example.com",
        user_id: null,
      });

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members`,
      );

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Local user ID is missing");
    });

    it("returns 404 when group is not found", async () => {
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("returns 403 when current user is not a group member", async () => {
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members`,
      );

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You are not a member of this group");
    });

    it("returns 200 and list of group members", async () => {
      const membersList = [
        {
          id: VALID_MEMBER_UUID,
          group_id: VALID_GROUP_UUID,
          user_id: "user-1",
          role: "owner",
        },
        {
          id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
          group_id: VALID_GROUP_UUID,
          user_id: "user-2",
          role: "member",
        },
      ];

      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      // First findOne checks current user's membership
      findOneMemberMock.mockResolvedValue({
        id: VALID_MEMBER_UUID,
        group_id: VALID_GROUP_UUID,
        user_id: "user-1",
      });

      findAllMemberMock.mockResolvedValue(membersList);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.group_id).toBe(VALID_GROUP_UUID);
      expect(res.body.members).toEqual(membersList);

      expect(findAllMemberMock).toHaveBeenCalledWith({
        where: { group_id: VALID_GROUP_UUID },
        order: [["createdAt", "ASC"]],
      });
    });
  });

  describe("GET /api/groups/:groupId/members/:memberId", () => {
    it("returns 400 when group or member ID is invalid", async () => {
      const res = await request(app).get(
        `/api/groups/invalid-id/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid group ID or member ID format");
    });

    it("returns 401 when authenticated user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("User not found for this JWT");
    });

    it("returns 500 when local user ID is missing", async () => {
      findOneUserMock.mockResolvedValue({
        auth_id: "supabase-auth-id",
        email: "user@example.com",
        user_id: null,
      });

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Local user ID is missing");
    });

    it("returns 404 when group is not found", async () => {
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("returns 403 when current user is not a member of group", async () => {
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You are not a member of this group");
    });

    it("returns 404 when requested group membership is not found", async () => {
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      findOneMemberMock
        .mockResolvedValueOnce({
          id: VALID_MEMBER_UUID,
          group_id: VALID_GROUP_UUID,
          user_id: "user-1",
        })
        .mockResolvedValueOnce(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group member not found");
    });

    it("returns 200 and member details when authorized", async () => {
      const memberObj = {
        id: VALID_MEMBER_UUID,
        group_id: VALID_GROUP_UUID,
        user_id: "user-2",
        role: "member",
        createdAt: "2026-09-06T00:00:00.000Z",
      };

      const memberUser = {
        user_id: "user-2",
        firstname: "Test",
        surname: "User",
        username: "testuser",
        email: "member@example.com",
      };

      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      findOneMemberMock
        // Current user's membership
        .mockResolvedValueOnce({
          id: "current-membership-id",
          group_id: VALID_GROUP_UUID,
          user_id: "user-1",
        })
        // Requested member's membership
        .mockResolvedValueOnce(memberObj);

      findByPkUserMock.mockResolvedValue(memberUser);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(res.body.member).toEqual({
        id: VALID_MEMBER_UUID,
        group_id: VALID_GROUP_UUID,
        user_id: "user-2",
        role: "member",
        createdAt: "2026-09-06T00:00:00.000Z",
        user: memberUser,
      });

      expect(findByPkUserMock).toHaveBeenCalledWith("user-2", {
        attributes: ["user_id", "firstname", "surname", "username", "email"],
      });
    });

    it("returns member details with user null when member user is not found", async () => {
      const memberObj = {
        id: VALID_MEMBER_UUID,
        group_id: VALID_GROUP_UUID,
        user_id: "user-2",
        role: "member",
        createdAt: "2026-09-06T00:00:00.000Z",
      };

      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      findOneMemberMock
        .mockResolvedValueOnce({
          id: "current-membership-id",
          group_id: VALID_GROUP_UUID,
          user_id: "user-1",
        })
        .mockResolvedValueOnce(memberObj);

      findByPkUserMock.mockResolvedValue(null);

      const res = await request(app).get(
        `/api/groups/${VALID_GROUP_UUID}/members/${VALID_MEMBER_UUID}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.member.id).toBe(VALID_MEMBER_UUID);
      expect(res.body.member.user).toBeNull();
    });
  });

  describe("POST /api/group-members/join", () => {
    it("returns 400 when invite code is missing", async () => {
      const res = await request(app).post("/api/group-members/join").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invite code is required");
    });

    it("returns 404 when group is not found with invite code", async () => {
      findOneGroupMock.mockResolvedValue(null);

      const res = await request(app).post("/api/group-members/join").send({
        invite_code: "INVALID",
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Invalid invite code");
    });

    it("returns 409 when user is already a member", async () => {
      findOneGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      findOneMemberMock.mockResolvedValue({
        id: VALID_MEMBER_UUID,
      });

      const res = await request(app).post("/api/group-members/join").send({
        invite_code: "CODE123",
      });

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

      findOneGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
      });

      findOneMemberMock.mockResolvedValue(null);
      createMemberMock.mockResolvedValue(createdMember);

      const res = await request(app).post("/api/group-members/join").send({
        invite_code: " code123 ",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Joined group successfully");
      expect(res.body.member.id).toBe(VALID_MEMBER_UUID);
      expect(res.body.member.role).toBe("member");

      expect(findOneGroupMock).toHaveBeenCalledWith({
        where: {
          invite_code: "CODE123",
        },
      });
    });
  });

  describe("DELETE /api/groups/:groupId/members/leave", () => {
    it("returns 400 when group ID is invalid", async () => {
      const res = await request(app).delete(
        "/api/groups/invalid-id/members/leave",
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid group ID");
    });

    it("returns 404 when group is not found", async () => {
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).delete(
        `/api/groups/${VALID_GROUP_UUID}/members/leave`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("returns 400 when group owner attempts to leave", async () => {
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "user-1",
      });

      const res = await request(app).delete(
        `/api/groups/${VALID_GROUP_UUID}/members/leave`,
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Group owner cannot leave");
    });

    it("returns 404 when user is not a member of group", async () => {
      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "owner-id",
      });

      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).delete(
        `/api/groups/${VALID_GROUP_UUID}/members/leave`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("You are not a member of this group");
    });

    it("returns 200 when normal member leaves group successfully", async () => {
      const destroyMock = vi.fn().mockResolvedValue(undefined);

      findByPkGroupMock.mockResolvedValue({
        id: VALID_GROUP_UUID,
        owner_id: "owner-id",
      });

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
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("You left the group successfully");

      expect(destroyMock).toHaveBeenCalledOnce();
    });
  });
});
