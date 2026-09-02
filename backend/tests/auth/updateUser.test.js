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

// Mock bcrypt hashing so update tests can simulate successful and failing password encryption.
vi.mock("bcrypt", () => ({
  default: {
    hash: hashMock,
  },
}));

// Mock the User model used by the update route.
vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    findByPk: findByPkMock,
    findOne: findOneMock,
    update: updateMock,
  },
}));

// Mock auth middleware so the route sees an authenticated user with id 1.
vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, res, next) => {
    req.user = { id: 1 };
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
      expect(res.body.message).toBe("You can only update your own account");
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
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("conflicts", () => {
    // Should return 409 if another user already has the requested username/email.
    it("returns 409 when username or email already exists", async () => {
      findByPkMock.mockResolvedValueOnce({
        id: 1,
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
      });
      findOneMock.mockResolvedValue({
        id: 2,
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

  describe("server errors", () => {
    // Should return 500 if the update operation fails unexpectedly.
    it("returns 500 when update fails", async () => {
      findByPkMock.mockResolvedValueOnce({
        id: 1,
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
      });
      findOneMock.mockResolvedValue(null);
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