import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Hoist the mock functions before module loading so the vi.mock factories can safely reference them.
// This keeps the group route tests isolated from the database and avoids hoisting-related runtime errors.
const { createMock, findAllMock, findByPkMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findAllMock: vi.fn(),
  findByPkMock: vi.fn(),
}));

// Inject a fake authenticated user into every request so the route logic can focus on the group behavior.
vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

// Mock the Group model so group tests do not hit a real database.
vi.mock("../../database/schemas/groupSchema.js", () => ({
  default: {
    create: createMock,
    findAll: findAllMock,
    findByPk: findByPkMock,
  },
}));

import createGroupRoute from "../../Api/Routes/Groups/createGroup.js";
import getGroupsRoute from "../../Api/Routes/Groups/getGroups.js";
import getGroupByIdRoute from "../../Api/Routes/Groups/getGroupById.js";
import deleteGroupRoute from "../../Api/Routes/Groups/deleteGroup.js";

// Mount all group routes under a tiny Express app for route testing.
const app = createTestApp(
  createGroupRoute,
  getGroupsRoute,
  getGroupByIdRoute,
  deleteGroupRoute
);

describe("Groups", () => {
  // Reset mock state before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create group", () => {
    // A group name is required to create a group.
    it("returns 400 when name is missing", async () => {
      const res = await request(app).post("/api/groups").send({});

      expect(res.status).toBe(400);
    });

    // If creation fails, the route should return 500.
    it("returns 500 when create fails", async () => {
      createMock.mockRejectedValue(new Error("create failed"));

      const res = await request(app).post("/api/groups").send({
        name: "Dev Team",
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("create failed");
    });
  });

  describe("get groups", () => {
    // If fetching groups fails, the route should return 500.
    it("returns 500 when fetching fails", async () => {
      findAllMock.mockRejectedValue(new Error("findAll failed"));

      const res = await request(app).get("/api/groups");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("findAll failed");
    });
  });

  describe("get group by id", () => {
    // If the group is not found, the route should return 404.
    it("returns 404 when group is missing", async () => {
      findByPkMock.mockResolvedValue(null);

      const res = await request(app).get("/api/groups/99");

      expect(res.status).toBe(404);
    });

    // If the lookup fails unexpectedly, return 500.
    it("returns 500 when lookup fails", async () => {
      findByPkMock.mockRejectedValue(new Error("lookup failed"));

      const res = await request(app).get("/api/groups/99");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("lookup failed");
    });
  });

  describe("delete group", () => {
    // Only the owner should be allowed to delete a group.
    it("returns 403 when user is not owner", async () => {
      findByPkMock.mockResolvedValue({
        id: 5,
        owner_id: 2,
        destroy: vi.fn(),
      });

      const res = await request(app).delete("/api/groups/5");

      expect(res.status).toBe(403);
    });

    // If destroy fails, the route should return 500.
    it("returns 500 when destroy fails", async () => {
      findByPkMock.mockResolvedValue({
        id: 5,
        owner_id: 1,
        destroy: vi.fn().mockRejectedValue(new Error("destroy failed")),
      });

      const res = await request(app).delete("/api/groups/5");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("destroy failed");
    });
  });
});