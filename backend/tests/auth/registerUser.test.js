import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

// Hoist the mock functions so Vitest can safely resolve them when it executes each vi.mock factory.
// This keeps the tests deterministic and prevents the route from depending on a real database.
const { findOneMock, createMock, hashMock } = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  createMock: vi.fn(),
  hashMock: vi.fn(),
}));

// Mock bcrypt hashing so we can trigger both success and failure paths in the registration flow.
vi.mock("bcrypt", () => ({
  default: {
    hash: hashMock,
  },
}));

// Mock the User model so the route can be tested without a real database
vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    findOne: findOneMock,
    create: createMock,
  },
}));

import registerUserRoute from "../../Api/Routes/auth/registerUser.js";

// Build a tiny Express app that mounts only the register route
const app = createTestApp(registerUserRoute);

describe("Auth > register user", () => {
  // Reset all mock call history and return values before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation errors", () => {
    // Should reject when no request body fields are provided
    it("returns 400 when fields are missing", async () => {
      const res = await request(app).post("/api/register-user").send({});

      expect(res.status).toBe(400);
      expect(res.body.sms).toEqual(["Please fill all fields"]);
    });

    // Should reject when password confirmation does not match
    it("returns 400 when passwords do not match", async () => {
      const res = await request(app).post("/api/register-user").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "secret123",
        confirmPassword: "wrong123",
      });

      expect(res.status).toBe(400);
      expect(res.body.sms).toEqual(["Password is not correct"]);
    });
  });

  describe("conflict", () => {
    // Should reject when a user with same username/email already exists
    it("returns 409 when user already exists", async () => {
      findOneMock.mockResolvedValue({ id: 1 });

      const res = await request(app).post("/api/register-user").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "secret123",
        confirmPassword: "secret123",
      });

      expect(res.status).toBe(409);
      expect(res.body.sms).toEqual(["User already exists"]);
    });
  });

  describe("server errors", () => {
    // Should return 500 if bcrypt hashing fails unexpectedly
    it("returns 500 when password hashing fails", async () => {
      findOneMock.mockResolvedValue(null);
      hashMock.mockRejectedValue(new Error("bcrypt failed"));

      const res = await request(app).post("/api/register-user").send({
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "secret123",
        confirmPassword: "secret123",
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("bcrypt failed");
    });
  });
});