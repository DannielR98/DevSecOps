/* import { beforeEach, describe, expect, it, vi } from "vitest";
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
 */

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

const app = createTestApp(
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  syncUser,
);

const id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
const otherId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

const token = jwt.sign(
  { sub: "supabase-user", email: "alice@example.com" },
  "profile-test-signing-secret",
);

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  findOne.mockResolvedValue({
    user_id: id,
    auth_id: "supabase-user",
    identity_provider: "supabase",
    username: "alice",
  });
});

describe("profile authentication", () => {
  it("rejects missing and invalid tokens, including tokens containing test", async () => {
    expect((await request(app).get("/api/users")).status).toBe(401);

    expect(
      (
        await request(app)
          .get(`/api/user/${id}`)
          .set("Authorization", "Bearer invalid-test-token")
      ).status,
    ).toBe(401);

    expect(
      (await request(app).post("/api/sync-user").send({ auth_id: "other" }))
        .status,
    ).toBe(401);

    expect(findAll).not.toHaveBeenCalled();
  });

  it("excludes passwords from authenticated user queries", async () => {
    findAll.mockResolvedValue([]);
    findOne.mockResolvedValue({ user_id: id, auth_id: "supabase-user", identity_provider: "supabase", username: "alice" });

    expect(
      (await request(app).get("/api/users").auth(token, { type: "bearer" }))
        .status,
    ).toBe(200);

    expect(
      (
        await request(app)
          .get(`/api/user/${id}`)
          .auth(token, { type: "bearer" })
      ).status,
    ).toBe(200);

    expect(findAll).toHaveBeenCalledWith({
      attributes: { exclude: ["password"] },
    });

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: { exclude: ["password"] },
      }),
    );
  });

  it("uses the verified identity instead of the request body when syncing", async () => {
    findOne.mockResolvedValue({
      identity_provider: "supabase",
      toJSON: () => ({
        user_id: id,
        auth_id: "supabase-user",
        password: "hash",
      }),
    });

    const res = await request(app)
      .post("/api/sync-user")
      .auth(token, { type: "bearer" })
      .send({
        auth_id: "other-user",
        email: "other@example.com",
      });

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("password");

    expect(findOne).toHaveBeenCalledWith({
      where: { auth_id: "supabase-user" },
    });
  });

  it("rejects an unverified existing subject on both sync and protected routes", async () => {
    findOne.mockResolvedValue({ user_id: id, auth_id: "supabase-user", identity_provider: null });
    const sync = await request(app).post("/api/sync-user").auth(token, { type: "bearer" }).send({});
    const protectedRoute = await request(app).get("/api/users").auth(token, { type: "bearer" });
    expect(sync.status).toBe(403);
    expect(protectedRoute.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(findAll).not.toHaveBeenCalled();
  });

  it("fails closed when the identity lookup fails", async () => {
    findOne.mockRejectedValue(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await request(app).get("/api/users").auth(token, { type: "bearer" });
      expect(res.status).toBe(500);
      expect(findAll).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("provisions a new identity from the verified token, not request identity fields", async () => {
    findOne.mockResolvedValue(null);
    create.mockResolvedValue({
      toJSON: () => ({ user_id: id, auth_id: "supabase-user" }),
    });
    const res = await request(app).post("/api/sync-user").auth(token, { type: "bearer" })
      .send({ auth_id: "other", email: "other@example.com", identity_provider: "local" });
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      auth_id: "supabase-user",
      email: "alice@example.com",
      identity_provider: "supabase",
    }));
  });

  it("does not link an existing account by email on provisioning conflict", async () => {
    findOne.mockResolvedValue(null);
    create.mockRejectedValue(Object.assign(new Error("conflict"), { name: "SequelizeUniqueConstraintError" }));
    const res = await request(app).post("/api/sync-user").auth(token, { type: "bearer" }).send({});
    expect(res.status).toBe(409);
    expect(findOne).toHaveBeenCalledTimes(2);
    expect(findOne).toHaveBeenNthCalledWith(1, { where: { auth_id: "supabase-user" } });
    expect(findOne).toHaveBeenNthCalledWith(2, { where: { auth_id: "supabase-user" } });
  });

  it("uses a concurrently created profile only when its subject is trusted", async () => {
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      identity_provider: "supabase",
      toJSON: () => ({ user_id: id, auth_id: "supabase-user", password: "hash" }),
    });
    create.mockRejectedValue(Object.assign(new Error("conflict"), { name: "SequelizeUniqueConstraintError" }));
    const res = await request(app).post("/api/sync-user").auth(token, { type: "bearer" }).send({});
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ user_id: id, auth_id: "supabase-user" });
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("does not accept an application-signed token as a Supabase identity", async () => {
    vi.stubEnv("JWT_SECRET", "different-local-secret");
    const localToken = jwt.sign({ sub: "supabase-user" }, "different-local-secret");
    const res = await request(app).get("/api/users").auth(localToken, { type: "bearer" });
    expect(res.status).toBe(401);
    expect(findOne).not.toHaveBeenCalled();
  });

  it("rejects a shared local and Supabase signing secret", async () => {
    vi.stubEnv("JWT_SECRET", "profile-test-signing-secret");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await request(app).get("/api/users").auth(token, { type: "bearer" });
      expect(res.status).toBe(500);
      expect(findOne).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("permits updating only the authenticated user's profile", async () => {
    const update = vi.fn().mockResolvedValue();

    findByPk.mockImplementation(async (userId) => {
      if (userId === otherId) {
        return {
          user_id: otherId,
          auth_id: "another-supabase-user",
          update,
        };
      }

      return {
        user_id: id,
        auth_id: "supabase-user",
        update,
        toJSON: () => ({
          user_id: id,
          firstname: "Alice",
          password: "hash",
        }),
      };
    });

    const forbidden = await request(app)
      .put(`/api/update-user/${otherId}`)
      .auth(token, { type: "bearer" })
      .send({ firstname: "Bob" });

    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .put(`/api/update-user/${id}`)
      .auth(token, { type: "bearer" })
      .send({ firstname: "Alice" });

    expect(allowed.status).toBe(200);
    expect(allowed.body.user).not.toHaveProperty("password");
    expect(update).toHaveBeenCalledWith({ firstname: "Alice" });
  });

  it("returns 500 when the authenticated user's database lookup fails", async () => {
    findByPk.mockRejectedValue(new Error("database unavailable"));

    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app)
        .put(`/api/update-user/${id}`)
        .auth(token, { type: "bearer" })
        .send({ firstname: "Alice" });

      expect(response.status).toBe(500);
      expect(findByPk).toHaveBeenCalledWith(id);
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("only lets the authenticated user delete their own database profile", async () => {
    const destroy = vi.fn().mockResolvedValue();

    findByPk.mockImplementation(async (userId) => {
      if (userId === otherId) {
        return {
          user_id: otherId,
          auth_id: "another-supabase-user",
          destroy,
        };
      }

      return {
        user_id: id,
        auth_id: "supabase-user",
        destroy,
      };
    });

    const forbidden = await request(app)
      .delete(`/api/delete-user/${otherId}`)
      .auth(token, { type: "bearer" });

    expect(forbidden.status).toBe(403);
    expect(destroy).not.toHaveBeenCalled();

    const allowed = await request(app)
      .delete(`/api/delete-user/${id}`)
      .auth(token, { type: "bearer" });

    expect(allowed.status).toBe(200);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
