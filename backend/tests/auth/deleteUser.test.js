import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const { findByPkMock, findOneMock, mockDestroy } = vi.hoisted(() => ({
  findByPkMock: vi.fn(),
  findOneMock: vi.fn(),
  mockDestroy: vi.fn(),
}));

const VALID_USER_UUID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
const OTHER_USER_UUID = "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";
//const TEST_AUTH_ID = "test-auth-id";

// Mock JWT middleware
vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, _res, next) => {
    req.user = {
      id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      user_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      auth_id: "test-auth-id",
      sub: "test-auth-id",
    };

    next();
  },
}));

// Mock User model
vi.mock("../../models/User.js", () => ({
  default: {
    findByPk: findByPkMock,
    findOne: findOneMock,
  },
}));

// Import route after mocks
import deleteUserRouter from "../../Api/UserRoute/deleteUser.js";

const app = createTestApp(deleteUserRouter);

describe("Auth > delete user", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Map the authenticated Supabase user to the local database user.
    findOneMock.mockResolvedValue({
      user_id: VALID_USER_UUID,
    });

    mockDestroy.mockResolvedValue(undefined);
  });

  it("returns 400 when user ID is not a valid UUID", async () => {
    const res = await request(app).delete("/api/delete-user/invalid-id");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid user ID");
  });

  it("returns 403 when deleting another user's account", async () => {
    const res = await request(app).delete(
      `/api/delete-user/${OTHER_USER_UUID}`,
    );

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("You are not authorized to delete this user");

    expect(findOneMock).toHaveBeenCalled();
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

  it("returns 500 when destroy throws", async () => {
    findByPkMock.mockResolvedValue({
      destroy: mockDestroy,
    });

    mockDestroy.mockRejectedValue(new Error("Database error"));

    const res = await request(app).delete(
      `/api/delete-user/${VALID_USER_UUID}`,
    );

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Failed to delete user");
  });

  it("returns 200 when user is deleted", async () => {
    findByPkMock.mockResolvedValue({
      destroy: mockDestroy,
    });

    const res = await request(app).delete(
      `/api/delete-user/${VALID_USER_UUID}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User deleted successfully");

    expect(mockDestroy).toHaveBeenCalledOnce();
  });
});
