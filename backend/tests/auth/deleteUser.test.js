import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Use a hoisted mock for the User model so Vitest can wire the mock before the route module loads.
const { findByPkMock } = vi.hoisted(() => ({
  findByPkMock: vi.fn(),
}));

// The delete route expects a valid JWT payload with the authenticated user id attached to req.user.
vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

// Mock the User model used by the delete route.
vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    findByPk: findByPkMock,
  },
}));

import deleteUserRoute from "../../Api/Routes/auth/deleteUser.js";

// Build a tiny Express app that mounts only the delete route.
const app = createTestApp(deleteUserRoute);

describe("Auth > delete user", () => {
  // Reset mocks before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    // Should block attempts to delete another user's account.
    it("returns 403 when deleting another user's account", async () => {
      const res = await request(app).delete("/api/delete-user/2");

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You can only delete your own account");
    });
  });

  describe("missing resource", () => {
    // Should return 404 when the requested user cannot be found.
    it("returns 404 when user does not exist", async () => {
      findByPkMock.mockResolvedValue(null);

      const res = await request(app).delete("/api/delete-user/1");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("server errors", () => {
    // Should return 500 if deleting the user throws unexpectedly.
    it("returns 500 when destroy throws", async () => {
      findByPkMock.mockResolvedValue({
        id: 1,
        firstname: "Alice",
        username: "alice",
        email: "alice@example.com",
        destroy: vi.fn().mockRejectedValue(new Error("destroy failed")),
      });

      const res = await request(app).delete("/api/delete-user/1");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("destroy failed");
    });
  });
});