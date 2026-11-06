import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const jwks = vi.hoisted(() => ({ keys: [] }));

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createRemoteJWKSet: () => actual.createLocalJWKSet({ keys: jwks.keys }),
  };
});

vi.mock("../src/lib/db.js", async () => {
  const { createFakeDynamo } = await import("./helpers/fakeDynamo.js");
  const table = {
    users: "users",
    uniques: "uniques",
    groups: "groups",
    members: "members",
    quizzes: "quizzes",
    results: "results",
  };
  const fake = createFakeDynamo(table);
  return { doc: fake.doc, table, __data: fake.data };
});

const { authenticate, createJWT, verifyToken } = await import("../src/lib/auth.js");
const { route } = await import("../src/lib/http.js");
const { users } = await import("../src/lib/repo.js");
const { __data } = await import("../src/lib/db.js");
const { handler: syncUser } = await import("../src/handlers/syncUser.js");
const { handler: getUsers } = await import("../src/handlers/getUsers.js");
const { handler: getUserById } = await import("../src/handlers/getUserById.js");
const { handler: updateUser } = await import("../src/handlers/updateUser.js");
const { handler: createGroup } = await import("../src/handlers/createGroup.js");
const { handler: createQuiz } = await import("../src/handlers/createQuiz.js");
const { handler: takeQuiz } = await import("../src/handlers/takeQuiz.js");

const secret = "test-secret-test-secret-test-secret-123";
const otherSecret = "other-secret-other-secret-other-secret-123";
const encode = (value) => new TextEncoder().encode(value);

beforeEach(() => {
  for (const map of Object.values(__data)) map.clear();
  vi.stubEnv("JWT_SECRET", secret);
  vi.stubEnv("SUPABASE_JWT_SECRET", "");
  vi.stubEnv("SUPABASE_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("authentication", () => {
  it("verifies app tokens and rejects expired or incorrectly signed tokens", async () => {
    const token = await createJWT({ user_id: "user-1", username: "alice", email: "a@example.com" });
    expect(await verifyToken(token)).toMatchObject({ user_id: "user-1", username: "alice" });

    const expired = await new SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1 second ago")
      .sign(encode(secret));
    const wrongSignature = await new SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(encode(otherSecret));
    await expect(verifyToken(expired)).rejects.toMatchObject({ status: 401 });
    await expect(verifyToken(wrongSignature)).rejects.toMatchObject({ status: 401 });
  });

  it("accepts legacy Supabase HS256 tokens and provisions a user once", async () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", otherSecret);
    const token = await new SignJWT({
      sub: "supabase-user",
      email: "Alice@example.com",
      user_metadata: { username: "alice", firstname: "Alice", surname: "Smith" },
    }).setProtectedHeader({ alg: "HS256" }).sign(encode(otherSecret));
    const event = { headers: { authorization: `Bearer ${token}` } };
    const first = await authenticate(event);
    const second = await authenticate(event);
    expect(first).toMatchObject({
      auth_id: "supabase-user",
      email: "alice@example.com",
      username: "alice",
      firstname: "Alice",
      surname: "Smith",
    });
    expect(second.user_id).toBe(first.user_id);
    expect(await users.list()).toHaveLength(1);
  });

  it("rejects missing bearer headers and tokens without an identity", async () => {
    await expect(authenticate({ headers: {} })).rejects.toMatchObject({ status: 401 });
    await expect(authenticate({ headers: { Authorization: "Basic value" } })).rejects.toMatchObject({ status: 401 });
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).sign(encode(secret));
    await expect(authenticate({ headers: { Authorization: `Bearer ${token}` } })).rejects.toMatchObject({ status: 401 });
  });

  it("verifies a Supabase JWKS token and provisions its user", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
    const publicJwk = await exportJWK(publicKey);
    jwks.keys = [{ ...publicJwk, kid: "test-key", alg: "RS256", use: "sig" }];
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    const token = await new SignJWT({ email: "jwks@example.com" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setSubject("jwks-user")
      .sign(privateKey);

    const response = await syncUser({
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ auth_id: "ignored" }),
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).user).toMatchObject({
      auth_id: "jwks-user",
      email: "jwks@example.com",
    });
  });

  it("supports the frontend sync, profile and quiz flow with a Supabase token", async () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", otherSecret);
    const token = await new SignJWT({
      sub: "frontend-user",
      email: "frontend@example.com",
      user_metadata: { username: "frontend", firstname: "Front", surname: "End" },
    }).setProtectedHeader({ alg: "HS256" }).sign(encode(otherSecret));
    const call = async (handler, body, params) => {
      const response = await handler({
        headers: { Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        pathParameters: params,
      });
      return { status: response.statusCode, body: JSON.parse(response.body) };
    };

    expect((await syncUser({ headers: {} })).statusCode).toBe(401);
    const synced = await call(syncUser, { auth_id: "another-user", email: "wrong@example.com" });
    expect(synced.status).toBe(200);
    expect(synced.body.user).toMatchObject({ auth_id: "frontend-user", email: "frontend@example.com" });
    expect(synced.body.user).not.toHaveProperty("password");
    const userId = synced.body.user.user_id;
    expect((await call(syncUser, {})).body.user.user_id).toBe(userId);
    const list = await call(getUsers);
    expect(list.body.users).toHaveLength(1);
    expect(list.body.users[0]).toMatchObject({ auth_id: "frontend-user", user_id: userId });
    expect((await call(getUserById, undefined, { user_id: userId })).body.user.user_id).toBe(userId);
    const updated = await call(updateUser, {
      firstname: "Updated",
      surname: "End",
      username: "frontend",
      email: "frontend@example.com",
    }, { user_id: userId });
    expect(updated.status).toBe(200);
    expect(updated.body.user.firstname).toBe("Updated");

    const group = await call(createGroup, { name: "Team" });
    expect(group.status).toBe(201);
    const quiz = await call(createQuiz, {
      title: "Test", category: "General", group_id: group.body.group.id,
      questions: [{ question: "Question?", options: ["A", "B"], correctAnswer: "B" }],
    });
    expect(quiz.status).toBe(201);
    const result = await call(takeQuiz, { answers: ["B"] }, { id: quiz.body.quiz.id });
    expect(result.status).toBe(201);
    expect(result.body.result).toMatchObject({ score: 1, total_questions: 1, percentage: 100 });
  });
});

describe("HTTP route wrapper", () => {
  const echo = route(async ({ body }) => [200, body], { auth: false });

  it.each([
    { requestContext: { http: { method: "OPTIONS" } } },
    { httpMethod: "OPTIONS" },
  ])("returns an empty preflight response before parsing or authentication", async (event) => {
    const handler = vi.fn();
    const response = await route(handler)({ ...event, body: "invalid json" });
    expect(response).toEqual({ statusCode: 204, body: "" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("parses JSON and base64-encoded bodies", async () => {
    const response = await echo({ body: Buffer.from('{"name":"test"}').toString("base64"), isBase64Encoded: true });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ name: "test" });
    expect(response.headers["Content-Type"]).toBe("application/json");
  });

  it.each(["{", "null", "[]", '"string"', "42"])("rejects non-object JSON: %s", async (body) => {
    const response = await echo({ body });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ success: false, message: "Request body must be a JSON object" });
  });

  it("logs unexpected errors and returns a sanitized 500 response", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fail = route(async () => { throw new Error("database details"); }, { auth: false });
    const response = await fail({});
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ success: false, message: "Internal server error" });
    expect(log).toHaveBeenCalledWith("Unhandled error:", expect.any(Error));
  });
});
