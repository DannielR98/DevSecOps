import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Hoist the model and crypto mocks so they are available while Vitest hoists the vi.mock factory calls.
const { findByPkMock, findOneMock, updateMock, hashMock } = vi.hoisted(() => ({
  findByPkMock: vi.fn(),
  findOneMock: vi.fn(),
  updateMock: vi.fn(),
  hashMock: vi.fn(),
}));

// These mocks isolate user lookup, conflict lookup, persistence, and password hashing.

// Mock bcrypt hashing so update tests can simulate successful and failing password encryption.
vi.mock("bcrypt", () => ({
  default: {
    hash: hashMock,
  },
}));

// Mock the User model used by the update route.
vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    // The route reads the current user, checks conflicts, and writes the update.
    findByPk: findByPkMock,
    findOne: findOneMock,
    update: updateMock,
  },
}));

// Mock Auth0 middleware so the route receives the subject of an authenticated user.
vi.mock("../../middleware/auth0.js", () => ({
  checkJwt: (req, res, next) => {
    req.user = { id: 1 };
    req.auth = { payload: { sub: "auth0|test-user" } };
    next();
  },
}));

import updateUserRoute from "../../Api/Routes/auth/updateUser.js";

// Build a tiny Express app that mounts only the update route.
const app = createTestApp(updateUserRoute);

describe("Auth > update user", () => {
  // Reset all mocks before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    // Should block attempts to update another user's account.
    it("returns 403 when updating another user", async () => {
      const res = await request(app).put("/api/update-user/2").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(403);
      expect(res.body.sms).toEqual(["You can only update your own account"]);
    });
  });

  describe("missing resource", () => {
    // Should return 404 when the user cannot be found.
    it("returns 404 when user does not exist", async () => {
      findByPkMock.mockResolvedValue(null);

      const res = await request(app).put("/api/update-user/1").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["User not found"]);
    });
  });

  describe("conflicts", () => {
    // Should return 409 if another user already has the requested username/email.
    it("returns 409 when username or email already exists", async () => {
      findOneMock.mockResolvedValue({
        id: 2,
        username: "johndoe",
        email: "john@example.com",
      });
      findByPkMock.mockResolvedValueOnce({
        id: 1,
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
      });
      const res = await request(app).put("/api/update-user/1").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(409);
      expect(res.body.sms).toEqual([
        "Username is already exist. Please try another username.",
        "Email is already exist. Please try another email.",
      ]);
    });
  });

  describe("successful updates", () => {
    // The complete update path returns the refreshed user after persistence.
    it("returns 200 when the user is updated", async () => {
      const updatedUser = {
        id: 1,
        firstname: "John",
        surname: "Doe",
        username: "johndoe2",
        email: "john2@example.com",
      };

      findOneMock.mockResolvedValue(null);
      findByPkMock
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(updatedUser);
      hashMock.mockResolvedValue("hashed-password");
      updateMock.mockResolvedValue([1]);

      const res = await request(app).put("/api/update-user/1").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe2",
        email: "john2@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(200);
      expect(res.body.sms).toEqual(["User successfully updated"]);
      expect(res.body.user).toEqual(updatedUser);
      expect(updateMock).toHaveBeenCalledOnce();
    });
  });

  describe("server errors", () => {
    // Should return 500 if the update operation fails unexpectedly.
    it("returns 500 when update fails", async () => {
      findOneMock.mockResolvedValue(null);
      findByPkMock.mockResolvedValueOnce({
        id: 1,
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
      });
      hashMock.mockResolvedValue("hashed-password");
      updateMock.mockRejectedValue(new Error("update failed"));

      const res = await request(app).put("/api/update-user/1").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe2",
        email: "john2@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("update failed");
    });
  });
});