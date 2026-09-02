import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Mock group model methods used across the group routes.
const createMock = vi.fn();
const findAllMock = vi.fn();
const findByPkMock = vi.fn();

// Mock auth middleware to treat requests as coming from user id 1.
vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

// Mock the group model so group route tests stay isolated.
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

// Build a test app with all group routes mounted under /api.
const app = createTestApp(
  createGroupRoute,
  getGroupsRoute,
  getGroupByIdRoute,
  deleteGroupRoute
);

describe("Groups", () => {
  // Reset all mocks before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create group", () => {
    // Should reject requests that do not include a group name.
    it("returns 400 when name is missing", async () => {
      const res = await request(app).post("/api/groups").send({});

      expect(res.status).toBe(400);
    });

    // Should return 500 if group creation fails unexpectedly.
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
    // Should return 500 if fetching groups fails unexpectedly.
    it("returns 500 when fetching fails", async () => {
      findAllMock.mockRejectedValue(new Error("findAll failed"));

      const res = await request(app).get("/api/groups");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("findAll failed");
    });
  });

  describe("get group by id", () => {
    // Should return 404 when the group does not exist.
    it("returns 404 when group is missing", async () => {
      findByPkMock.mockResolvedValue(null);

      const res = await request(app).get("/api/groups/99");

      expect(res.status).toBe(404);
    });

    // Should return 500 if the lookup throws unexpectedly.
    it("returns 500 when lookup fails", async () => {
      findByPkMock.mockRejectedValue(new Error("lookup failed"));

      const res = await request(app).get("/api/groups/99");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("lookup failed");
    });
  });

  describe("delete group", () => {
    // Should prevent non-owners from deleting the group.
    it("returns 403 when user is not owner", async () => {
      findByPkMock.mockResolvedValue({
        id: 5,
        owner_id: 2,
        destroy: vi.fn(),
      });

      const res = await request(app).delete("/api/groups/5");

      expect(res.status).toBe(403);
    });

    // Should return 500 if deleting the group throws unexpectedly.
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