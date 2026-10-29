import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

const VALID_USER_UUID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
const OTHER_USER_UUID = "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";

const { findByPkMock } = vi.hoisted(() => ({
  findByPkMock: vi.fn(),
}));

vi.mock("../../middleware/verifyJWT.js", () => ({
  default: (req, _res, next) => {
    req.user = { id: VALID_USER_UUID, user_id: VALID_USER_UUID };
    next();
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findByPk: findByPkMock,
  },
}));

import updateUserRoute from "../../Api/UserRoute/updateUser.js";

const app = createTestApp(updateUserRoute);

describe("Auth > update user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("returns 400 when user ID is not a valid UUID", async () => {
      const res = await request(app).put("/api/update-user/invalid-id").send({
        firstname: "John",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid user ID");
    });

    it("returns 403 when updating another user", async () => {
      const res = await request(app).put(`/api/update-user/${OTHER_USER_UUID}`).send({
        firstname: "John",
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You are not authorized to update this user");
    });
  });

  describe("missing resource", () => {
    it("returns 404 when user does not exist", async () => {
      findByPkMock.mockResolvedValue(null);

      const res = await request(app).put(`/api/update-user/${VALID_USER_UUID}`).send({
        firstname: "John",
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("conflicts", () => {
    it("returns 409 when username or email already exists", async () => {
      const uniqueConstraintError = new Error("Unique constraint error");
      uniqueConstraintError.name = "SequelizeUniqueConstraintError";

      findByPkMock.mockResolvedValue({
        user_id: VALID_USER_UUID,
        update: vi.fn().mockRejectedValue(uniqueConstraintError),
      });

      const res = await request(app).put(`/api/update-user/${VALID_USER_UUID}`).send({
        email: "taken@example.com",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email or username already exists");
    });
  });

  describe("successful updates", () => {
    it("returns 200 when the user is updated", async () => {
      const userInstance = {
        user_id: VALID_USER_UUID,
        firstname: "OldName",
        surname: "Doe",
        username: "johndoe",
        email: "john@example.com",
        update: vi.fn().mockResolvedValue(undefined),
        toJSON: vi.fn(() => ({
          user_id: VALID_USER_UUID,
          firstname: "NewName",
          surname: "Doe",
          username: "johndoe",
          email: "john@example.com",
        })),
      };

      findByPkMock.mockResolvedValue(userInstance);

      const res = await request(app).put(`/api/update-user/${VALID_USER_UUID}`).send({
        firstname: "NewName",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.firstname).toBe("NewName");
      expect(userInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ firstname: "NewName" }),
      );
    });
  });

  describe("server errors", () => {
    it("returns 500 when update fails", async () => {
      findByPkMock.mockResolvedValue({
        user_id: VALID_USER_UUID,
        update: vi.fn().mockRejectedValue(new Error("unexpected update failure")),
      });

      const res = await request(app).put(`/api/update-user/${VALID_USER_UUID}`).send({
        firstname: "NewName",
      });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to update user");
    });
  });
});