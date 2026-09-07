import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const {
  createGroupMock,
  createMemberMock,
  findAllGroupMock,
  findByPkGroupMock,
  findAllMemberMock,
  findOneUserMock,
  createUserMock,
} = vi.hoisted(() => ({
  createGroupMock: vi.fn(),
  createMemberMock: vi.fn(),
  findAllGroupMock: vi.fn(),
  findByPkGroupMock: vi.fn(),
  findAllMemberMock: vi.fn(),
  findOneUserMock: vi.fn(),
  createUserMock: vi.fn(),
}));

// These mocks cover group persistence, membership persistence, and local-user lookup.

// Provide the Auth0 subject expected by every protected group route.
vi.mock("../../middleware/auth0.js", () => ({
  checkJwt: (req, res, next) => {
    req.auth = { payload: { sub: "auth0|test-user" } };
    next();
  },
}));

vi.mock("../../database/schemas/groupSchema.js", () => ({
  default: {
    // Group routes create, list, and retrieve groups through these methods.
    create: createGroupMock,
    findAll: findAllGroupMock,
    findByPk: findByPkGroupMock,
  },
}));

vi.mock("../../database/schemas/groupMemberSchema.js", () => ({
  default: {
    // Group creation and listing both depend on membership operations.
    create: createMemberMock,
    findAll: findAllMemberMock,
  },
}));

vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    // A group request may find or create the local Auth0 user.
    findOne: findOneUserMock,
    create: createUserMock,
  },
}));

import createGroupRoute from "../../Api/Routes/Groups/createGroup.js";
import getGroupsRoute from "../../Api/Routes/Groups/getGroups.js";
import getGroupByIdRoute from "../../Api/Routes/Groups/getGroupById.js";
import deleteGroupRoute from "../../Api/Routes/Groups/deleteGroup.js";

const app = createTestApp(
  createGroupRoute,
  getGroupsRoute,
  getGroupByIdRoute,
  deleteGroupRoute,
);

describe("Groups", () => {
  // Reset every mock before each independent route scenario.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The route rejects a request that does not provide a group name.
  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/groups").send({});

    expect(res.status).toBe(400);
  });

  // A database error while creating the group becomes a 500 response.
  it("returns 500 when create fails", async () => {
    findOneUserMock.mockResolvedValue({ id: 1 });
    createGroupMock.mockRejectedValue(new Error("create failed"));

    const res = await request(app).post("/api/groups").send({
      name: "Dev Team",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("create failed");
  });

  // Successful creation returns the group and adds the owner membership.
  it("returns 200 when a group is created", async () => {
    const newGroup = {
      id: 5,
      name: "Dev Team",
      invite_code: "ABC123",
      owner_id: 1,
    };
    findOneUserMock.mockResolvedValue({ id: 1 });
    createGroupMock.mockResolvedValue(newGroup);
    createMemberMock.mockResolvedValue(undefined);

    const res = await request(app).post("/api/groups").send({
      name: "Dev Team",
    });

    expect(res.status).toBe(201);
    expect(res.body.group).toEqual(newGroup);
    expect(createMemberMock).toHaveBeenCalledOnce();
  });

  // A first-time Auth0 user is created locally before becoming group owner.
  it("creates the local user before creating a group", async () => {
    const localUser = { id: 2, auth0_id: "auth0|test-user" };
    const newGroup = {
      id: 6,
      name: "New Team",
      invite_code: "XYZ789",
      owner_id: 2,
    };
    findOneUserMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue(localUser);
    createGroupMock.mockResolvedValue(newGroup);
    createMemberMock.mockResolvedValue(undefined);

    const res = await request(app).post("/api/groups").send({
      name: "New Team",
    });

    expect(res.status).toBe(201);
    expect(createUserMock).toHaveBeenCalledWith({
      auth0_id: "auth0|test-user",
      email: "auth0|test-user@auth0.user",
    });
    expect(createGroupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Team",
        owner_id: 2,
      }),
    );
    expect(res.body.group).toEqual(newGroup);
  });

  // A failure while listing groups becomes a 500 response.
  it("returns 500 when fetching fails", async () => {
    findOneUserMock.mockResolvedValue({ id: 1 });
    findAllMemberMock.mockResolvedValue([]);
    findAllGroupMock.mockRejectedValue(new Error("findAll failed"));

    const res = await request(app).get("/api/groups");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("findAll failed");
  });

  // Successful listing maps ownership into the is_owner response field.
  it("returns 200 when groups are fetched", async () => {
    const group = {
      id: 5,
      name: "Dev Team",
      invite_code: "ABC123",
      owner_id: 1,
      createdAt: "2026-09-06T00:00:00.000Z",
    };
    findOneUserMock.mockResolvedValue({ id: 1 });
    findAllMemberMock.mockResolvedValue([{ group_id: 5 }]);
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

  // A missing group ID returns a not-found response.
  it("returns 404 when group is missing", async () => {
    findByPkGroupMock.mockResolvedValue(null);

    const res = await request(app).get("/api/groups/99");

    expect(res.status).toBe(404);
  });

  // Unexpected lookup errors are returned as a 500 response.
  it("returns 500 when lookup fails", async () => {
    findByPkGroupMock.mockRejectedValue(new Error("lookup failed"));

    const res = await request(app).get("/api/groups/99");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("lookup failed");
  });

  // A valid group lookup returns the selected group details.
  it("returns 200 when a group is found", async () => {
    const group = {
      id: 5,
      name: "Dev Team",
      owner_id: 1,
      createdAt: "2026-09-06T00:00:00.000Z",
    };
    findByPkGroupMock.mockResolvedValue(group);

    const res = await request(app).get("/api/groups/5");

    expect(res.status).toBe(200);
    expect(res.body.group).toEqual(group);
  });

  // Only the group owner may delete the group.
  it("returns 403 when user is not owner", async () => {
    findOneUserMock.mockResolvedValue({ id: 1 });
    findByPkGroupMock.mockResolvedValue({ id: 5, owner_id: 2 });

    const res = await request(app).delete("/api/groups/5");

    expect(res.status).toBe(403);
  });

  // A failure while deleting the group becomes a 500 response.
  it("returns 500 when destroy fails", async () => {
    findOneUserMock.mockResolvedValue({ id: 1 });
    findByPkGroupMock.mockResolvedValue({
      id: 5,
      owner_id: 1,
      destroy: vi.fn().mockRejectedValue(new Error("destroy failed")),
    });

    const res = await request(app).delete("/api/groups/5");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("destroy failed");
  });

  // The owner can delete a group successfully and its destroy method is called.
  it("returns 200 when a group is deleted", async () => {
    const group = {
      id: 5,
      owner_id: 1,
      destroy: vi.fn().mockResolvedValue(undefined),
    };
    findOneUserMock.mockResolvedValue({ id: 1 });
    findByPkGroupMock.mockResolvedValue(group);

    const res = await request(app).delete("/api/groups/5");

    expect(res.status).toBe(200);
    expect(res.body.sms).toEqual(["Grupp borttagen"]);
    expect(group.destroy).toHaveBeenCalledOnce();
  });
});
