import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const { findAllUserMock, findByPkUserMock } = vi.hoisted(() => ({
  findAllUserMock: vi.fn(),
  findByPkUserMock: vi.fn(),
}));

vi.mock("../../middleware/auth0.js", () => ({
  checkJwt: (req, res, next) => {
    req.auth = { payload: { sub: "auth0|test-user" } };
    next();
  },
}));

vi.mock("../../database/schemas/userSchema.js", () => ({
  default: {
    findAll: findAllUserMock,
    findByPk: findByPkUserMock,
  },
}));

import getUsersRoute from "../../Api/Routes/auth/getUser.js";
import getUserByIdRoute from "../../Api/Routes/auth/getUserId.js";

const app = createTestApp(getUsersRoute, getUserByIdRoute);

describe("Auth User Lookup Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/users", () => {
    it("returns 200 and list of users", async () => {
      const usersList = [{ id: 1, email: "a@test.com" }];
      findAllUserMock.mockResolvedValue(usersList);

      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual(usersList);
    });

    it("returns 500 when database query fails", async () => {
      findAllUserMock.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/users");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("DB error");
    });
  });

  describe("GET /api/user/:userId", () => {
    it("returns 404 when user is not found", async () => {
      findByPkUserMock.mockResolvedValue(null);

      const res = await request(app).get("/api/user/99");

      expect(res.status).toBe(404);
      expect(res.body.sms).toEqual(["User not found"]);
    });

    it("returns 200 and user when found", async () => {
      const user = { id: 5, email: "user5@test.com" };
      findByPkUserMock.mockResolvedValue(user);

      const res = await request(app).get("/api/user/5");

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(user);
    });

    it("returns 500 when lookup fails", async () => {
      findByPkUserMock.mockRejectedValue(new Error("Lookup failure"));

      const res = await request(app).get("/api/user/5");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Lookup failure");
    });
  });
});
