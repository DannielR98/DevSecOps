import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";

vi.hoisted(() => {
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_ANON_KEY = "";
  process.env.SUPABASE_JWT_SECRET = "profile-test-signing-secret";
});

const { findAll, findOne, findByPk, create } = vi.hoisted(() => ({
  findAll: vi.fn(),
  findOne: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../../models/User.js", () => ({
  default: { findAll, findOne, findByPk, create },
}));

import getUsers from "../../Api/UserRoute/getUsers.js";
import getUserById from "../../Api/UserRoute/getUserById.js";
import updateUser from "../../Api/UserRoute/updateUser.js";
import deleteUser from "../../Api/UserRoute/deleteUser.js";
import syncUser from "../../Api/UserRoute/syncUser.js";

const app = createTestApp(getUsers, getUserById, updateUser, deleteUser, syncUser);
const id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
const otherId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
const token = jwt.sign({ sub: "supabase-user", email: "alice@example.com" }, "profile-test-signing-secret");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("profile authentication", () => {
  it("rejects missing and invalid tokens, including tokens containing test", async () => {
    expect((await request(app).get("/api/users")).status).toBe(401);
    expect((await request(app).get(`/api/user/${id}`).set("Authorization", "Bearer invalid-test-token")).status).toBe(401);
    expect((await request(app).post("/api/sync-user").send({ auth_id: "other" })).status).toBe(401);
    expect(findAll).not.toHaveBeenCalled();
  });

  it("excludes passwords from authenticated user queries", async () => {
    findAll.mockResolvedValue([]);
    findOne.mockResolvedValue({ user_id: id, username: "alice" });
    expect((await request(app).get("/api/users").auth(token, { type: "bearer" })).status).toBe(200);
    expect((await request(app).get(`/api/user/${id}`).auth(token, { type: "bearer" })).status).toBe(200);
    expect(findAll).toHaveBeenCalledWith({ attributes: { exclude: ["password"] } });
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ attributes: { exclude: ["password"] } }));
  });

  it("uses the verified identity instead of the request body when syncing", async () => {
    findOne.mockResolvedValue({
      toJSON: () => ({ user_id: id, auth_id: "supabase-user", password: "hash" }),
    });
    const res = await request(app).post("/api/sync-user").auth(token, { type: "bearer" })
      .send({ auth_id: "other-user", email: "other@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("password");
    expect(findOne).toHaveBeenCalledWith({ where: { auth_id: "supabase-user" } });
  });

  it("permits updating only the resolved authenticated user", async () => {
    findOne.mockResolvedValue({ user_id: id, auth_id: "supabase-user", email: "alice@example.com" });
    const update = vi.fn().mockResolvedValue();
    findByPk.mockResolvedValue({ update, toJSON: () => ({ user_id: id, firstname: "Alice", password: "hash" }) });
    const forbidden = await request(app).put(`/api/update-user/${otherId}`).auth(token, { type: "bearer" }).send({ firstname: "Bob" });
    expect(forbidden.status).toBe(403);
    const allowed = await request(app).put(`/api/update-user/${id}`).auth(token, { type: "bearer" }).send({ firstname: "Alice" });
    expect(allowed.status).toBe(200);
    expect(allowed.body.user).not.toHaveProperty("password");
    expect(update).toHaveBeenCalledWith({ firstname: "Alice" });
  });

  it("fails closed when the authenticated user lookup fails", async () => {
    findOne.mockRejectedValue(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await request(app).put(`/api/update-user/${id}`).auth(token, { type: "bearer" }).send({ firstname: "Alice" });
      expect(response.status).toBe(500);
      expect(findByPk).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("only lets the authenticated user delete their own database profile", async () => {
    findOne.mockResolvedValue({ user_id: id, auth_id: "supabase-user", email: "alice@example.com" });
    const destroy = vi.fn().mockResolvedValue();
    findByPk.mockResolvedValue({ destroy });
    const forbidden = await request(app).delete(`/api/delete-user/${otherId}`).auth(token, { type: "bearer" });
    expect(forbidden.status).toBe(403);
    expect(destroy).not.toHaveBeenCalled();
    const allowed = await request(app).delete(`/api/delete-user/${id}`).auth(token, { type: "bearer" });
    expect(allowed.status).toBe(200);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
