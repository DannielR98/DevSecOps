import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_USER_UUID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
const OTHER_USER_UUID = "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";
const TEST_AUTH_ID = "test-auth-id";

const { findByPkMock, mockDestroy } = vi.hoisted(() => ({
  findByPkMock: vi.fn(),
  mockDestroy: vi.fn(),
}));

// Mock the middleware used by deleteUser.js
vi.mock("../../middleware/supabaseAuth.js", () => ({
  checkJwt: (req, _res, next) => {
    req.user = {
      id: VALID_USER_UUID,
      user_id: VALID_USER_UUID,
      auth_id: TEST_AUTH_ID,
      sub: TEST_AUTH_ID,
    };
    next();
  },
}));

// Mock User model
vi.mock("../../models/User.js", () => ({
  default: {
    findByPk: findByPkMock,
  },
}));

import deleteUserRouter from "../../Api/UserRoute/deleteUser.js";

const app = createTestApp(deleteUserRouter);

describe("Auth > delete user", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDestroy.mockResolvedValue(undefined);

    // Default: authenticated user's own account
    findByPkMock.mockResolvedValue({
      user_id: VALID_USER_UUID,
      auth_id: TEST_AUTH_ID,
      destroy: mockDestroy,
    });
  });

  it("returns 400 when user ID is not a valid UUID", async () => {
    const res = await request(app).delete("/api/delete-user/invalid-id");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid user ID");

    expect(findByPkMock).not.toHaveBeenCalled();
  });

  it("returns 404 when user does not exist", async () => {
    findByPkMock.mockResolvedValue(null);

    const res = await request(app).delete(
      `/api/delete-user/${VALID_USER_UUID}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User not found");
  });

  it("returns 403 when deleting another user's account", async () => {
    findByPkMock.mockResolvedValue({
      user_id: OTHER_USER_UUID,
      auth_id: "another-auth-id",
      destroy: mockDestroy,
    });

    const res = await request(app).delete(
      `/api/delete-user/${OTHER_USER_UUID}`,
    );

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("You are not authorized to delete this user");

    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("returns 500 when destroy throws", async () => {
    mockDestroy.mockRejectedValue(new Error("Database error"));

    const res = await request(app).delete(
      `/api/delete-user/${VALID_USER_UUID}`,
    );

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Failed to delete user");
  });

  it("returns 200 when user deletes their own account", async () => {
    const res = await request(app).delete(
      `/api/delete-user/${VALID_USER_UUID}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User deleted successfully");

    expect(mockDestroy).toHaveBeenCalledOnce();
  });
});
