import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Mock user lookup and creation so synchronization can be tested without a database.
const { findOneMock, createMock } = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  createMock: vi.fn(),
}));

// Provide a stable Auth0 subject without requiring a real access token.
vi.mock("../../middleware/auth0.js", () => ({
  checkJwt: (req, res, next) => {
    req.auth = { payload: { sub: "auth0|test-user" } };
    next();
  },
}));

vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    // The route may look up an Auth0 ID or email and may create a new local user.
    findOne: findOneMock,
    create: createMock,
  },
}));

import syncUserRoute from "../../Api/Routes/auth/syncUser.js";

const app = createTestApp(syncUserRoute);

describe("Auth > sync user", () => {
  // Reset calls and implementations between synchronization scenarios.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // An existing Auth0 match is returned without creating another local user.
  it("returns an existing user matched by Auth0 id", async () => {
    const user = { id: 1, auth0_id: "auth0|test-user", email: "john@example.com" };
    findOneMock.mockResolvedValueOnce(user);

    const res = await request(app).post("/api/sync-user").send({
      email: "john@example.com",
      name: "John Doe",
      nickname: "john",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User synced successfully");
    expect(res.body.user).toEqual(user);
    expect(createMock).not.toHaveBeenCalled();
  });

  // An email-only match is linked to the Auth0 subject and saved.
  it("links an existing email account to Auth0", async () => {
    const user = {
      id: 1,
      email: "john@example.com",
      save: vi.fn().mockResolvedValue(undefined),
    };
    findOneMock.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

    const res = await request(app).post("/api/sync-user").send({
      email: "john@example.com",
    });

    expect(res.status).toBe(200);
    expect(user.auth0_id).toBe("auth0|test-user");
    expect(user.save).toHaveBeenCalledOnce();
    expect(createMock).not.toHaveBeenCalled();
  });

  // When no match exists, the Auth0 profile is converted into a new local user.
  it("creates a local user when no matching user exists", async () => {
    const createdUser = { id: 2, auth0_id: "auth0|test-user" };
    findOneMock.mockResolvedValue(null);
    createMock.mockResolvedValue(createdUser);

    const res = await request(app).post("/api/sync-user").send({
      email: "jane@example.com",
      name: "Jane Doe",
      nickname: "jane",
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(createdUser);
    expect(createMock).toHaveBeenCalledWith({
      auth0_id: "auth0|test-user",
      email: "jane@example.com",
      username: "jane",
      firstname: "Jane",
      surname: "Doe",
    });
  });

  // Missing profile fields use the route's deterministic Auth0 fallback values.
  it("creates a user with Auth0 fallback values when profile data is missing", async () => {
    const createdUser = { id: 3, auth0_id: "auth0|test-user" };
    findOneMock.mockResolvedValue(null);
    createMock.mockResolvedValue(createdUser);

    const res = await request(app).post("/api/sync-user").send({});

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(createdUser);
    expect(createMock).toHaveBeenCalledWith({
      auth0_id: "auth0|test-user",
      email: "auth0|test-user@auth0.user",
      username: "auth0|test-user",
      firstname: "Auth0",
      surname: "User",
    });
  });

  // Database failures are exposed as a controlled 500 response.
  it("returns 500 when synchronization fails", async () => {
    findOneMock.mockRejectedValue(new Error("sync failed"));

    const res = await request(app).post("/api/sync-user").send({
      email: "jane@example.com",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("sync failed");
  });
});
