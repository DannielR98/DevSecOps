import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

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
    findAll: findAllMemberMock,
    findOne: findOneMemberMock,
    create: createMemberMock,
  },
}));

import getGroupMembersRoute from "../../Api/Routes/GroupMember/getGroupMembers.js";
import getGroupMemberByIdRoute from "../../Api/Routes/GroupMember/getGroupMemberById.js";
import joinGroupMemberRoute from "../../Api/Routes/GroupMember/joinGroup.js";
import leaveGroupRoute from "../../Api/Routes/GroupMember/leaveGroup.js";

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
    it("returns 200 and list of group members", async () => {
      const membersList = [{ id: 1, group_id: 10, user_id: 1, role: "owner" }];
      findAllMemberMock.mockResolvedValue(membersList);

      const res = await request(app).get("/api/groups/10/members");

      expect(res.status).toBe(200);
      expect(res.body.members).toEqual(membersList);
    });

    it("returns 500 when query fails", async () => {
      findAllMemberMock.mockRejectedValue(new Error("Query failed"));

      const res = await request(app).get("/api/groups/10/members");

      expect(res.status).toBe(500);
      expect(res.body.sms).toEqual(["Could not get group members"]);
    });
  });

  describe("GET /api/groups/:groupId/members/:memberId", () => {
    it("returns 404 when requesting user is not found in local DB", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).get("/api/groups/10/members/1");

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["User not found"]);
    });

    it("returns 403 when requesting user is not a member of the group", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).get("/api/groups/10/members/2");

      expect(res.status).toBe(403);
      expect(res.body.sms).toEqual(["You are not a member of this group"]);
    });

    it("returns 404 when target member is not found", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      // First findOne for membership check returns membership, second findOne for target returns null
      findOneMemberMock
        .mockResolvedValueOnce({ id: 10, group_id: 10, user_id: 1 })
        .mockResolvedValueOnce(null);

      const res = await request(app).get("/api/groups/10/members/99");

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["Group member not found"]);
    });

    it("returns 200 and member details when found", async () => {
      const memberObj = { id: 2, group_id: 10, user_id: 2, role: "member" };
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneMemberMock
        .mockResolvedValueOnce({ id: 1, group_id: 10, user_id: 1 })
        .mockResolvedValueOnce(memberObj);

      const res = await request(app).get("/api/groups/10/members/2");

      expect(res.status).toBe(200);
      expect(res.body.member).toEqual(memberObj);
    });
  });

  describe("POST /api/group-members/join", () => {
    it("returns 400 when invite code is missing", async () => {
      const res = await request(app).post("/api/group-members/join").send({});

      expect(res.status).toBe(400);
      expect(res.body.sms).toEqual(["Invite code is required"]);
    });

    it("returns 404 when user is missing", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/group-members/join")
        .send({ invite_code: "CODE" });

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["User not found"]);
    });

    it("returns 404 when group invite code is invalid", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneGroupMock.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/group-members/join")
        .send({ invite_code: "INVALID" });

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["Invalid invite code"]);
    });

    it("returns 409 when user is already a group member", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneGroupMock.mockResolvedValue({ id: 10 });
      findOneMemberMock.mockResolvedValue({ id: 5 });

      const res = await request(app)
        .post("/api/group-members/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(409);
      expect(res.body.sms).toEqual(["You are already a member of this group"]);
    });

    it("returns 201 and joins group successfully", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findOneGroupMock.mockResolvedValue({ id: 10 });
      findOneMemberMock.mockResolvedValue(null);
      createMemberMock.mockResolvedValue({
        id: 50,
        group_id: 10,
        user_id: 1,
        role: "member",
      });

      const res = await request(app)
        .post("/api/group-members/join")
        .send({ invite_code: "CODE123" });

      expect(res.status).toBe(201);
      expect(res.body.sms).toEqual(["Joined group successfully"]);
      expect(res.body.member).toEqual({
        id: 50,
        group_id: 10,
        user_id: 1,
        role: "member",
      });
    });
  });

  describe("DELETE /api/groups/:groupId/members/leave", () => {
    it("returns 400 when group ID is invalid", async () => {
      const res = await request(app).delete("/api/groups/abc/members/leave");

      expect(res.status).toBe(400);
      expect(res.body.sms).toEqual(["Invalid group ID"]);
    });

    it("returns 404 when user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).delete("/api/groups/10/members/leave");

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["User not found"]);
    });

    it("returns 404 when group is not found", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkGroupMock.mockResolvedValue(null);

      const res = await request(app).delete("/api/groups/10/members/leave");

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["Group not found"]);
    });

    it("returns 400 when group owner attempts to leave", async () => {
      findOneUserMock.mockResolvedValue({ id: 1 });
      findByPkGroupMock.mockResolvedValue({ id: 10, owner_id: 1 });

      const res = await request(app).delete("/api/groups/10/members/leave");

      expect(res.status).toBe(400);
      expect(res.body.sms).toEqual([
        "Group owner cannot leave the group. Transfer ownership first.",
      ]);
    });

    it("returns 404 when user is not a group member", async () => {
      findOneUserMock.mockResolvedValue({ id: 2 });
      findByPkGroupMock.mockResolvedValue({ id: 10, owner_id: 1 });
      findOneMemberMock.mockResolvedValue(null);

      const res = await request(app).delete("/api/groups/10/members/leave");

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["You are not a member of this group"]);
    });

    it("returns 200 and leaves group successfully", async () => {
      const destroyMock = vi.fn().mockResolvedValue(undefined);
      findOneUserMock.mockResolvedValue({ id: 2 });
      findByPkGroupMock.mockResolvedValue({ id: 10, owner_id: 1 });
      findOneMemberMock.mockResolvedValue({ id: 50, destroy: destroyMock });

      const res = await request(app).delete("/api/groups/10/members/leave");

      expect(res.status).toBe(200);
      expect(res.body.sms).toEqual(["You left the group successfully"]);
      expect(destroyMock).toHaveBeenCalledOnce();
    });
  });
});
