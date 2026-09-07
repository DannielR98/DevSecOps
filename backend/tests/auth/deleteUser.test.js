import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Mock the local user lookup, owned-group lookup, and membership deletion calls.
const { findOneMock, findAllMock, destroyMock } = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  findAllMock: vi.fn(),
  destroyMock: vi.fn(),
}));

// Provide the Auth0 subject expected by the route without requiring a real token.
vi.mock("../../middleware/auth0.js", () => ({
  checkJwt: (req, res, next) => {
    req.auth = { payload: { sub: "auth0|test-user" } };
    next();
  },
}));

vi.mock("../../database/schemas/userSchema.js", () => ({
  // The delete route identifies the local user through the Auth0 subject.
  default: { findOne: findOneMock },
}));

vi.mock("../../database/schemas/groupSchema.js", () => ({
  // The route loads groups owned by the user before deleting the account.
  default: { findAll: findAllMock },
}));

vi.mock("../../database/schemas/groupMemberSchema.js", () => ({
  // The route removes memberships before destroying the user.
  default: { destroy: destroyMock },
}));

import deleteUserRoute from "../../Api/Routes/auth/deleteUser.js";

const app = createTestApp(deleteUserRoute);

describe("Auth > delete user", () => {
  // Clear calls and configured behavior so each scenario starts independently.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // A valid user may delete only the account associated with their own ID.
  it("returns 403 when deleting another user's account", async () => {
    findOneMock.mockResolvedValue({ id: 1, auth0_id: "auth0|test-user" });

    const res = await request(app).delete("/api/delete-user/2");

    expect(res.status).toBe(403);
    expect(res.body.sms).toEqual(["You can only delete your own account"]);
  });

  // No local user for the Auth0 subject means there is nothing to delete.
  it("returns 404 when user does not exist", async () => {
    findOneMock.mockResolvedValue(null);

    const res = await request(app).delete("/api/delete-user/1");

    expect(res.status).toBe(404);
    expect(res.body.sms).toEqual(["User not found"]);
  });

  // Unexpected failure while destroying the user is converted to a 500 response.
  it("returns 500 when destroy throws", async () => {
    findOneMock.mockResolvedValue({
      id: 1,
      auth0_id: "auth0|test-user",
      destroy: vi.fn().mockRejectedValue(new Error("destroy failed")),
    });
    findAllMock.mockResolvedValue([]);
    destroyMock.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/delete-user/1");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("destroy failed");
  });

  // With no owned groups and successful database calls, deletion completes with 200.
  it("returns 200 when user is deleted", async () => {
    const user = {
      id: 1,
      auth0_id: "auth0|test-user",
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    findOneMock.mockResolvedValue(user);
    findAllMock.mockResolvedValue([]);
    destroyMock.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/delete-user/1");

    expect(res.status).toBe(200);
    expect(res.body.sms).toEqual(["User successfully deleted"]);
    expect(user.destroy).toHaveBeenCalledOnce();
  });
});
