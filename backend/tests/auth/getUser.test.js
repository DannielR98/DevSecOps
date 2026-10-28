import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_USER_UUID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

const { findAllUserMock, findOneUserMock } = vi.hoisted(() => ({
  findAllUserMock: vi.fn(),
  findOneUserMock: vi.fn(),
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findAll: findAllUserMock,
    findOne: findOneUserMock,
  },
}));

import getUsersRoute from "../../Api/UserRoute/getUsers.js";
import getUserByIdRoute from "../../Api/UserRoute/getUserById.js";

const app = createTestApp(getUsersRoute, getUserByIdRoute);

describe("Auth User Lookup Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/users", () => {
    it("returns 200 and list of users", async () => {
      const usersList = [{ user_id: VALID_USER_UUID, email: "a@test.com" }];
      findAllUserMock.mockResolvedValue(usersList);

      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual(usersList);
    });

    it("returns 500 when database query fails", async () => {
      findAllUserMock.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/users");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to fetch users");
    });
  });

  describe("GET /api/user/:userId", () => {
    it("returns 400 when user ID is not a valid UUID", async () => {
      const res = await request(app).get("/api/user/99");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid user ID");
    });

    it("returns 404 when user is not found", async () => {
      findOneUserMock.mockResolvedValue(null);

      const res = await request(app).get(`/api/user/${VALID_USER_UUID}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("returns 200 and user when found", async () => {
      const user = { user_id: VALID_USER_UUID, email: "user5@test.com" };
      findOneUserMock.mockResolvedValue(user);

      const res = await request(app).get(`/api/user/${VALID_USER_UUID}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(user);
    });

    it("returns 500 when lookup fails", async () => {
      findOneUserMock.mockRejectedValue(new Error("Lookup failure"));

      const res = await request(app).get(`/api/user/${VALID_USER_UUID}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to fetch user");
    });
  });
});
