import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Mock dependencies so login tests do not depend on a live database or JWT.
const findOneMock = vi.fn();
const compareMock = vi.fn();
const jwtMock = vi.fn();

// Mock bcrypt compare so we can simulate correct and incorrect passwords.
vi.mock("bcrypt", () => ({
  default: {
    compare: compareMock,
  },
}));

// Mock the User model so the login route can be tested in isolation.
vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    findOne: findOneMock,
  },
}));

// Mock JWT generation so we control the returned token.
vi.mock("../../middleware/jwt.js", () => ({
  default: jwtMock,
}));

import loginUserRoute from "../../Api/Routes/auth/loginUser.js";

// Build a tiny Express app that mounts only the login route.
const app = createTestApp(loginUserRoute);

describe("Auth > login user", () => {
  // Reset all mock state before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation errors", () => {
    // Should reject requests missing username.
    it("returns 400 when username is missing", async () => {
      const res = await request(app).post("/api/login-user").send({
        password: "secret123",
      });

      expect(res.status).toBe(400);
      expect(res.body.emptyFields).toEqual(["username"]);
    });

    // Should reject requests missing password.
    it("returns 400 when password is missing", async () => {
      const res = await request(app).post("/api/login-user").send({
        username: "johndoe",
      });

      expect(res.status).toBe(400);
      expect(res.body.emptyFields).toEqual(["password"]);
    });
  });

  describe("authentication failures", () => {
    // Should return 404 if no matching user exists.
    it("returns 404 when user does not exist", async () => {
      findOneMock.mockResolvedValue(null);

      const res = await request(app).post("/api/login-user").send({
        username: "missing",
        password: "secret123",
      });

      expect(res.status).toBe(404);
    });

    // Should return 401 if the password does not match the stored hash.
    it("returns 401 when password is wrong", async () => {
      findOneMock.mockResolvedValue({
        id: 1,
        username: "johndoe",
        password: "hashed-password",
      });
      compareMock.mockResolvedValue(false);

      const res = await request(app).post("/api/login-user").send({
        username: "johndoe",
        password: "wrong",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("server errors", () => {
    // Should return 500 if JWT generation throws unexpectedly.
    it("returns 500 when JWT creation throws", async () => {
      findOneMock.mockResolvedValue({
        id: 1,
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "hashed-password",
      });
      compareMock.mockResolvedValue(true);
      jwtMock.mockImplementation(() => {
        throw new Error("jwt failed");
      });

      const res = await request(app).post("/api/login-user").send({
        username: "johndoe",
        password: "secret123",
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("jwt failed");
    });
  });
});