import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { createTestApp } from "../helpers/testApp.js";

const { findOneUserMock, createUserMock } = vi.hoisted(() => ({
  findOneUserMock: vi.fn(),
  createUserMock: vi.fn(),
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findOne: findOneUserMock,
    create: createUserMock,
  },
}));

vi.mock("../../middleware/jwt.js", () => ({
  default: () => "mock-jwt-token-123",
}));

import registerUserRoute from "../../Api/UserRoute/registerUser.js";
import loginUserRoute from "../../Api/UserRoute/LoginUser.js";

const app = createTestApp(registerUserRoute, loginUserRoute);

describe("Auth > Register & Login Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/register", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/api/register").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });

    it("returns 409 when email, username, or auth_id already exists", async () => {
      const uniqueError = new Error("Unique constraint");
      uniqueError.name = "SequelizeUniqueConstraintError";
      createUserMock.mockRejectedValue(uniqueError);

      const res = await request(app).post("/api/register").send({
        auth_id: "supabase|123",
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "password123",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already exists");
    });

    it("returns 201 when user is registered successfully", async () => {
      const createdUser = {
        user_id: "user-uuid-1",
        auth_id: "supabase|123",
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        role_id: null,
        createdAt: new Date().toISOString(),
      };
      createUserMock.mockResolvedValue(createdUser);

      const res = await request(app).post("/api/register").send({
        auth_id: "supabase|123",
        firstname: "John",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User registered successfully");
      expect(res.body.user.username).toBe("johndoe");
      expect(createUserMock).toHaveBeenCalledOnce();
    });
  });

  describe("POST /api/login", () => {
    it("returns 400 when username/email or password is missing", async () => {
      const res = await request(app).post("/api/login").send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 when user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).post("/api/login").send({
        user: "nonexistent",
        password: "password123",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("Invalid username/email or password");
    });

    it("returns 401 when password does not match", async () => {
      const hashedPassword = await bcrypt.hash("correct-password", 10);
      findOneUserMock.mockResolvedValue({
        user_id: "user-uuid-1",
        username: "johndoe",
        email: "john@example.com",
        password: hashedPassword,
      });

      const res = await request(app).post("/api/login").send({
        user: "johndoe",
        password: "wrong-password",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain("Invalid username/email or password");
    });

    it("returns 200 and JWT token when login is successful", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      const userObj = {
        user_id: "user-uuid-1",
        username: "johndoe",
        email: "john@example.com",
        password: hashedPassword,
        toJSON: vi.fn(() => ({
          user_id: "user-uuid-1",
          username: "johndoe",
          email: "john@example.com",
        })),
      };

      findOneUserMock.mockResolvedValue(userObj);

      const res = await request(app).post("/api/login").send({
        user: "johndoe",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe("mock-jwt-token-123");
      expect(res.body.user.username).toBe("johndoe");
    });
  });
});
