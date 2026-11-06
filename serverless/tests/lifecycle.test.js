import { beforeEach, describe, expect, it, vi } from "vitest";

const TABLES = {
  users: "users",
  groups: "groups",
  members: "members",
  quizzes: "quizzes",
  results: "results",
  uniques: "uniques",
};

vi.mock("../src/lib/db.js", async () => {
  const { createFakeDynamo } = await import("./helpers/fakeDynamo.js");
  const fake = createFakeDynamo(TABLES);
  return { doc: fake.doc, table: TABLES, __data: fake.data };
});

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const { handler: registerUser } = await import("../src/handlers/registerUser.js");
const { handler: loginUser } = await import("../src/handlers/loginUser.js");
const { handler: getUsers } = await import("../src/handlers/getUsers.js");
const { handler: getUserById } = await import("../src/handlers/getUserById.js");
const { handler: updateUser } = await import("../src/handlers/updateUser.js");
const { handler: deleteUser } = await import("../src/handlers/deleteUser.js");
const { handler: createGroup } = await import("../src/handlers/createGroup.js");
const { handler: getGroups } = await import("../src/handlers/getGroups.js");
const { handler: getGroupById } = await import("../src/handlers/getGroupById.js");
const { handler: updateGroup } = await import("../src/handlers/updateGroup.js");
const { handler: deleteGroup } = await import("../src/handlers/deleteGroup.js");
const { handler: joinGroup } = await import("../src/handlers/joinGroup.js");
const { handler: leaveGroup } = await import("../src/handlers/leaveGroup.js");
const { handler: getGroupMembers } = await import("../src/handlers/getGroupMembers.js");
const { handler: getGroupMemberById } = await import("../src/handlers/getGroupMemberById.js");
const { handler: joinGroupMember } = await import("../src/handlers/joinGroupMember.js");
const { handler: createQuiz } = await import("../src/handlers/createQuiz.js");
const { handler: getQuizzes } = await import("../src/handlers/getQuizzes.js");
const { handler: getQuizById } = await import("../src/handlers/getQuizById.js");
const { handler: updateQuiz } = await import("../src/handlers/updateQuiz.js");
const { handler: takeQuiz } = await import("../src/handlers/takeQuiz.js");
const { handler: getQuizResults } = await import("../src/handlers/getQuizResults.js");
const { handler: deleteQuiz } = await import("../src/handlers/deleteQuiz.js");
const db = await import("../src/lib/db.js");
const { quizResults: resultsRepo } = await import("../src/lib/repo.js");

const call = async (fn, { token, body, params, query } = {}) => {
  const res = await fn({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
    pathParameters: params,
    queryStringParameters: query,
  });
  return { status: res.statusCode, body: JSON.parse(res.body) };
};

const questions = [
  { question: "2+2?", options: ["3", "4"], correctAnswer: "4" },
  { question: "Sky?", options: ["blue", "green"], correctAnswer: "blue" },
];

const signUp = async (name) => {
  const reg = await call(registerUser, {
    body: {
      auth_id: `auth-${name}`,
      firstname: name,
      surname: "Tester",
      username: name,
      email: `${name}@Example.com`,
      password: "password123",
    },
  });
  expect(reg.status).toBe(201);
  const login = await call(loginUser, {
    body: { user: name, password: "password123" },
  });
  expect(login.status).toBe(200);
  return { id: reg.body.user.user_id, token: login.body.token };
};

beforeEach(() => {
  for (const map of Object.values(db.__data)) map.clear();
});

describe("users", () => {
  it("reports invalid registration and login fields", async () => {
    const registration = await call(registerUser, { body: { email: "not-an-email" } });
    expect(registration.status).toBe(400);
    expect(registration.body).toMatchObject({ success: false, message: "Validation failed" });
    expect(registration.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "email" }),
      expect.objectContaining({ field: "username" }),
    ]));
    const login = await call(loginUser, { body: { user: "", password: "" } });
    expect(login.status).toBe(400);
    expect(login.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "user" }),
      expect.objectContaining({ field: "password" }),
    ]));
  });

  it("registers, logs in by username or email and hides password hashes", async () => {
    const alice = await signUp("alice");

    const byEmail = await call(loginUser, {
      body: { user: "ALICE@example.com", password: "password123" },
    });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.user.password).toBeUndefined();

    const list = await call(getUsers, { token: alice.token });
    expect(list.body.count).toBe(1);
    expect(list.body.users[0].password).toBeUndefined();
  });

  it("rejects duplicates, bad passwords and unauthenticated calls", async () => {
    await signUp("alice");

    const dup = await call(registerUser, {
      body: {
        auth_id: "other",
        firstname: "A",
        surname: "B",
        username: "alice",
        email: "other@example.com",
      },
    });
    expect(dup.status).toBe(409);

    const bad = await call(loginUser, { body: { user: "alice", password: "nope" } });
    expect(bad.status).toBe(401);

    expect((await call(getUsers)).status).toBe(401);
    expect((await call(getUsers, { token: "garbage" })).status).toBe(401);
  });

  it("only lets users update themselves and releases old unique keys", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");

    const forbidden = await call(updateUser, {
      token: bob.token,
      params: { user_id: alice.id },
      body: { firstname: "X" },
    });
    expect(forbidden.status).toBe(403);

    const renamed = await call(updateUser, {
      token: alice.token,
      params: { user_id: alice.id },
      body: { username: "alice2" },
    });
    expect(renamed.status).toBe(200);

    const reuse = await call(updateUser, {
      token: bob.token,
      params: { user_id: bob.id },
      body: { username: "alice" },
    });
    expect(reuse.status).toBe(200);

    const clash = await call(updateUser, {
      token: bob.token,
      params: { user_id: bob.id },
      body: { username: "alice2" },
    });
    expect(clash.status).toBe(409);
  });

  it("looks up users without exposing passwords and restricts account deletion", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    const missingId = "00000000-0000-4000-8000-000000000001";

    expect((await call(getUserById, { token: alice.token, params: { user_id: "bad" } })).status).toBe(400);
    expect((await call(getUserById, { token: alice.token, params: { user_id: missingId } })).status).toBe(404);
    const found = await call(getUserById, { token: bob.token, params: { user_id: alice.id } });
    expect(found.status).toBe(200);
    expect(found.body.user).toMatchObject({ user_id: alice.id, username: "alice" });
    expect(found.body.user).not.toHaveProperty("password");

    expect((await call(deleteUser, { token: bob.token, params: { user_id: alice.id } })).status).toBe(403);
    expect((await call(deleteUser, { token: alice.token, params: { user_id: alice.id } })).status).toBe(200);
    expect((await call(getUserById, { token: bob.token, params: { user_id: alice.id } })).status).toBe(404);

    const registeredAgain = await call(registerUser, {
      body: {
        auth_id: "auth-alice",
        firstname: "Alice",
        surname: "Tester",
        username: "alice",
        email: "alice@example.com",
      },
    });
    expect(registeredAgain.status).toBe(201);
  });
});

describe("groups, members and quizzes", () => {
  it("restricts personal results and exposes only each participant's best score to members", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    const outsider = await signUp("outsider");
    const group = (await call(createGroup, { token: alice.token, body: { name: "Team" } })).body.group;
    expect((await call(joinGroup, { token: bob.token, body: { invite_code: group.invite_code } })).status).toBe(200);
    const quiz = (await call(createQuiz, {
      token: alice.token, body: { title: "Quiz", category: "Math", group_id: group.id, questions },
    })).body.quiz;
    const params = { id: quiz.id };
    const mine = { view: "mine" };
    const leaderboard = { view: "leaderboard" };
    expect((await call(getQuizResults, { token: alice.token, params, query: mine })).body.results).toEqual([]);
    await call(takeQuiz, { token: alice.token, params, body: { answers: ["3", "green"] } });
    await call(takeQuiz, { token: alice.token, params, body: { answers: ["4", "blue"] } });
    await call(takeQuiz, { token: alice.token, params, body: { answers: ["3", "green"] } });
    await call(takeQuiz, { token: bob.token, params, body: { answers: ["4", "green"] } });
    await resultsRepo.create({ quiz_id: quiz.id, user_id: bob.id, score: 2, total_questions: 5 });
    const personal = await call(getQuizResults, { token: alice.token, params, query: mine });
    expect(personal.status).toBe(200);
    expect(personal.body.results).toHaveLength(3);
    expect(personal.body.results.map((r) => r.percentage).sort((a, b) => a - b)).toEqual([0, 0, 100]);
    expect(personal.body.results.every((r) => !("user_id" in r))).toBe(true);
    const leaders = await call(getQuizResults, { token: bob.token, params, query: leaderboard });
    expect(leaders.body.results).toMatchObject([
      { username: "alice", percentage: 100, attempt_count: 3 },
      { username: "bob", percentage: 50, attempt_count: 2 },
    ]);
    expect(leaders.body.results).toHaveLength(2);
    expect(leaders.body.results[1]).toMatchObject({ score: 1, total_questions: 2 });
    const bobPersonal = await call(getQuizResults, { token: bob.token, params, query: mine });
    expect(bobPersonal.body.results).toHaveLength(2);
    expect(bobPersonal.body.results.map((r) => r.percentage).sort((a, b) => a - b)).toEqual([40, 50]);
    expect((await call(leaveGroup, { token: bob.token, params: { groupId: group.id } })).status).toBe(200);
    expect((await call(getQuizResults, { token: bob.token, params, query: mine })).status).toBe(403);
    expect((await call(getQuizResults, { token: bob.token, params, query: leaderboard })).status).toBe(403);
    const afterLeaving = await call(getQuizResults, { token: alice.token, params, query: leaderboard });
    expect(afterLeaving.body.results).toMatchObject([
      { username: "alice", percentage: 100 }, { username: "bob", percentage: 50 },
    ]);
    expect((await call(getQuizResults, { token: outsider.token, params, query: leaderboard })).status).toBe(403);
    expect((await call(getQuizResults, { token: outsider.token, params, query: mine })).status).toBe(403);
    expect((await call(getQuizResults, { params, query: mine })).status).toBe(401);
    expect((await call(getQuizResults, { token: alice.token, params, query: {} })).status).toBe(400);
    expect((await call(getQuizResults, { token: alice.token, params: { id: "invalid" }, query: mine })).status).toBe(400);
    expect((await call(getQuizResults, {
      token: alice.token, params: { id: "00000000-0000-4000-8000-000000000001" }, query: mine,
    })).status).toBe(404);
  });

  it("uses unrounded percentages and resolves tied attempts deterministically", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    const group = (await call(createGroup, { token: alice.token, body: { name: "Team" } })).body.group;
    const quiz = (await call(createQuiz, {
      token: alice.token, body: { title: "Quiz", category: "Math", group_id: group.id, questions },
    })).body.quiz;
    await call(getQuizResults, { token: alice.token, params: { id: quiz.id }, query: { view: "mine" } });
    const rows = [
      { id: "c", user_id: alice.id, score: 2, total_questions: 3, createdAt: "2026-01-03T00:00:00.000Z" },
      { id: "b", user_id: alice.id, score: 4, total_questions: 6, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "a", user_id: alice.id, score: 2, total_questions: 3, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "d", user_id: bob.id, score: 67, total_questions: 100, createdAt: "2026-01-02T00:00:00.000Z" },
    ];
    for (const row of rows) {
      db.__data[TABLES.results].set(row.id, { ...row, quiz_id: quiz.id });
    }
    const response = await call(getQuizResults, {
      token: alice.token, params: { id: quiz.id }, query: { view: "leaderboard" },
    });
    expect(response.status).toBe(200);
    expect(response.body.results).toMatchObject([
      { username: "bob", score: 67, total_questions: 100, percentage: 67, attempt_count: 1 },
      { username: "alice", score: 2, total_questions: 3, percentage: 67, attempt_count: 3 },
    ]);
  });

  it("rejects invalid group and quiz input before storing data", async () => {
    const alice = await signUp("alice");
    const group = await call(createGroup, { token: alice.token, body: { name: "" } });
    expect(group.status).toBe(400);
    expect(group.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: "name" })]));
    const quiz = await call(createQuiz, {
      token: alice.token,
      body: {
        title: "Test",
        category: "Math",
        group_id: "not-a-uuid",
        questions: [{ question: "2+2?", options: ["3", "4"], correctAnswer: "5" }],
      },
    });
    expect(quiz.status).toBe(400);
    expect(quiz.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "group_id" }),
      expect.objectContaining({ field: "questions.0.correctAnswer" }),
    ]));
    expect(db.__data[TABLES.groups]?.size ?? 0).toBe(0);
    expect(db.__data[TABLES.quizzes]?.size ?? 0).toBe(0);
  });

  it("validates invite codes and restricts member lookup to group members", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    const carol = await signUp("carol");
    const group = (await call(createGroup, { token: alice.token, body: { name: "Team" } })).body.group;
    const missingId = "00000000-0000-4000-8000-000000000001";

    expect((await call(getGroupById, { token: alice.token, params: { groupId: "bad" } })).status).toBe(400);
    expect((await call(getGroupById, { token: alice.token, params: { groupId: missingId } })).status).toBe(404);
    expect((await call(getGroupById, { token: alice.token, params: { groupId: group.id } })).body.group.id).toBe(group.id);
    expect((await call(joinGroupMember, { token: bob.token, body: {} })).status).toBe(400);
    expect((await call(joinGroupMember, { token: bob.token, body: { invite_code: "missing" } })).status).toBe(404);

    const joined = await call(joinGroupMember, {
      token: bob.token,
      body: { invite_code: ` ${group.invite_code.toLowerCase()} ` },
    });
    expect(joined.status).toBe(201);
    expect((await call(joinGroupMember, { token: bob.token, body: { invite_code: group.invite_code } })).status).toBe(409);

    const params = { groupId: group.id, memberId: joined.body.member.id };
    expect((await call(getGroupMemberById, { token: carol.token, params })).status).toBe(403);
    expect((await call(getGroupMemberById, { token: alice.token, params: { ...params, memberId: "bad" } })).status).toBe(400);
    expect((await call(getGroupMemberById, { token: alice.token, params: { ...params, memberId: missingId } })).status).toBe(404);
    const found = await call(getGroupMemberById, { token: alice.token, params });
    expect(found.status).toBe(200);
    expect(found.body.member.user).toMatchObject({ user_id: bob.id, username: "bob" });
    expect(found.body.member.user).not.toHaveProperty("password");
  });

  it("runs the full group/quiz lifecycle", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    const carol = await signUp("carol");

    const created = await call(createGroup, { token: alice.token, body: { name: "Team" } });
    expect(created.status).toBe(201);
    const group = created.body.group;

    expect((await call(getGroups, { token: alice.token })).body.groups).toHaveLength(1);
    expect((await call(getGroups, { token: bob.token })).body.groups).toHaveLength(0);

    const join = await call(joinGroup, {
      token: bob.token,
      body: { invite_code: group.invite_code.toLowerCase() },
    });
    expect(join.status).toBe(200);
    const again = await call(joinGroup, {
      token: bob.token,
      body: { invite_code: group.invite_code },
    });
    expect(again.status).toBe(409);

    const members = await call(getGroupMembers, {
      token: alice.token,
      params: { groupId: group.id },
    });
    expect(members.body.members).toHaveLength(2);

    const rename = await call(updateGroup, {
      token: bob.token,
      params: { groupId: group.id },
      body: { name: "Hacked" },
    });
    expect(rename.status).toBe(403);

    const quiz = await call(createQuiz, {
      token: bob.token,
      body: { title: "Quiz", category: "Math", group_id: group.id, questions },
    });
    expect(quiz.status).toBe(201);
    const quizId = quiz.body.quiz.id;

    const outsider = await call(createQuiz, {
      token: carol.token,
      body: { title: "Nope", category: "Math", group_id: group.id, questions },
    });
    expect(outsider.status).toBe(403);
    expect(
      (await call(getQuizById, { token: carol.token, params: { id: quizId } })).status,
    ).toBe(403);

    const list = await call(getQuizzes, { token: alice.token });
    expect(list.body.count).toBe(1);
    expect(list.body.quizzes[0]).toMatchObject({ group_name: "Team", is_creator: false });

    const filtered = await call(getQuizzes, {
      token: carol.token,
      query: { group_id: group.id },
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.quizzes).toEqual([]);

    const submit = await call(takeQuiz, {
      token: alice.token,
      params: { id: quizId },
      body: { answers: ["4", "green"] },
    });
    expect(submit.body.result).toMatchObject({ score: 1, total_questions: 2, percentage: 50 });

    const updated = await call(updateQuiz, {
      token: bob.token,
      params: { id: quizId },
      body: { title: "Renamed" },
    });
    expect(updated.body.quiz.title).toBe("Renamed");
    expect(
      (await call(updateQuiz, { token: alice.token, params: { id: quizId }, body: {} })).status,
    ).toBe(403);

    expect(
      (await call(leaveGroup, { token: alice.token, params: { groupId: group.id } })).status,
    ).toBe(400);
    expect(
      (await call(leaveGroup, { token: bob.token, params: { groupId: group.id } })).status,
    ).toBe(200);
    // Bob rejoins so that the group has data to cascade over.
    await call(joinGroup, { token: bob.token, body: { invite_code: group.invite_code } });

    expect(
      (await call(deleteGroup, { token: bob.token, params: { groupId: group.id } })).status,
    ).toBe(403);
    expect(
      (await call(deleteGroup, { token: alice.token, params: { groupId: group.id } })).status,
    ).toBe(200);

    for (const name of ["groups", "members", "quizzes", "results"]) {
      expect(db.__data[TABLES[name]]?.size ?? 0).toBe(0);
    }
    expect(
      [...db.__data[TABLES.uniques].keys()].some((k) => k.startsWith("invite#")),
    ).toBe(false);
  });

  it("lets only the creator delete a quiz and removes its results", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    const group = (await call(createGroup, { token: alice.token, body: { name: "G" } })).body
      .group;
    const quiz = (
      await call(createQuiz, {
        token: alice.token,
        body: { title: "Q", category: "C", group_id: group.id, questions },
      })
    ).body.quiz;
    await call(takeQuiz, {
      token: alice.token,
      params: { id: quiz.id },
      body: { answers: ["4", "blue"] },
    });
    expect(db.__data[TABLES.results].size).toBe(1);

    expect((await call(deleteQuiz, { token: bob.token, params: { id: quiz.id } })).status).toBe(403);
    expect(db.__data[TABLES.quizzes].size).toBe(1);
    const del = await call(deleteQuiz, { token: alice.token, params: { id: quiz.id } });
    expect(del.status).toBe(200);
    expect(db.__data[TABLES.results].size).toBe(0);
    expect(db.__data[TABLES.quizzes].size).toBe(0);
  });
});
