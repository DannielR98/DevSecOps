import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_USER_UUID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
const OTHER_USER_UUID = "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";

const { findByPkMock } = vi.hoisted(() => ({
  findByPkMock: vi.fn(),
}));

vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
    req.user = { id: VALID_USER_UUID, user_id: VALID_USER_UUID };
    next();
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findByPk: findByPkMock,
  },
}));

import deleteUserRoute from "../../Api/UserRoute/deleteUser.js";

const app = createTestApp(deleteUserRoute);

describe("Auth > delete user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when user ID is not a valid UUID", async () => {
    const res = await request(app).delete("/api/delete-user/invalid-id");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid user ID");
  });

  it("returns 403 when deleting another user's account", async () => {
    const res = await request(app).delete(`/api/delete-user/${OTHER_USER_UUID}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("You are not authorized to delete this user");
  });

  it("returns 404 when user does not exist", async () => {
    findByPkMock.mockResolvedValue(null);

    const res = await request(app).delete(`/api/delete-user/${VALID_USER_UUID}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("returns 500 when destroy throws", async () => {
    findByPkMock.mockResolvedValue({
      user_id: VALID_USER_UUID,
      destroy: vi.fn().mockRejectedValue(new Error("destroy failed")),
    });

    const res = await request(app).delete(`/api/delete-user/${VALID_USER_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to delete user");
  });

  it("returns 200 when user is deleted", async () => {
    const mockDestroy = vi.fn().mockResolvedValue(undefined);
    findByPkMock.mockResolvedValue({
      user_id: VALID_USER_UUID,
      destroy: mockDestroy,
    });

    const res = await request(app).delete(`/api/delete-user/${VALID_USER_UUID}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDestroy).toHaveBeenCalledOnce();
  });
});
