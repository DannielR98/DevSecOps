import { randomBytes, randomUUID } from "node:crypto";
import { v5 as uuidv5 } from "uuid";
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { doc, table } from "./db.js";
import { HttpError } from "./errors.js";

const now = () => new Date().toISOString();

const get = async (TableName, Key) =>
  (await doc.send(new GetCommand({ TableName, Key }))).Item ?? null;

// DynamoDB may return only one page even for an indexed query. Continue with
// LastEvaluatedKey so callers do not accidentally omit later records.
const queryAll = async (params) => {
  const items = [];
  let ExclusiveStartKey;
  do {
    const page = await doc.send(new QueryCommand({ ...params, ExclusiveStartKey }));
    items.push(...(page.Items ?? []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
};
// Split a list into chunks of the specified size.
const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

// BatchGet accepts up to 100 keys. Unprocessed keys must be retried; duplicate
// IDs are removed because DynamoDB rejects repeated keys in one request.
const batchGet = async (TableName, keyName, ids) => {
  const unique = [...new Set(ids)];
  const items = [];
  // Process the IDs in chunks of 100 to comply with DynamoDB limits.
  for (const part of chunk(unique, 100)) {
    let keys = part.map((id) => ({ [keyName]: id }));
    while (keys.length > 0) {
      const res = await doc.send(
        new BatchGetCommand({ RequestItems: { [TableName]: { Keys: keys } } }),
      );
      items.push(...(res.Responses?.[TableName] ?? []));
      keys = res.UnprocessedKeys?.[TableName]?.Keys ?? [];
    }
  }
  return items;
};

// BatchWrite accepts up to 25 operations and may return unprocessed requests.
const batchDelete = async (TableName, keys) => {
  for (const part of chunk(keys, 25)) {
    let requests = part.map((Key) => ({ DeleteRequest: { Key } }));
    while (requests.length > 0) {
      const res = await doc.send(
        new BatchWriteCommand({ RequestItems: { [TableName]: requests } }),
      );
      requests = res.UnprocessedItems?.[TableName] ?? [];
    }
  }
};

// Callers provide a conflict message for canceled transactions; other DynamoDB
// errors propagate so the HTTP wrapper can log them and return a 500.
const transact = async (TransactItems, conflictMessage) => {
  try {
    await doc.send(new TransactWriteCommand({ TransactItems }));
  } catch (error) {
    if (error.name === "TransactionCanceledException") {
      throw new HttpError(409, conflictMessage);
    }
    throw error;
  }
};

const put = (TableName, Item, ConditionExpression) => ({
  Put: { TableName, Item, ConditionExpression },
});

// ---------------------------------------------------------------------------
// Users. Unique attributes (auth_id, email, username) are enforced with lock
// items in the uniques table and double as lookup indexes.
// ---------------------------------------------------------------------------

const userKeys = (user) => [
  `auth#${user.auth_id}`,
  `email#${user.email}`,
  `username#${user.username}`,
];

const uniqueLock = (key, ref_id) =>
  put(table.uniques, { pk: key, ref_id }, "attribute_not_exists(pk)");

const USER_CONFLICT = "Email, username, or auth_id already exists";

export const users = {
  get: (userId) => get(table.users, { user_id: userId }),
  getMany: (ids) => (ids.length ? batchGet(table.users, "user_id", ids) : []),

  async byUnique(key) {
    const lock = await get(table.uniques, { pk: key });
    return lock ? this.get(lock.ref_id) : null;
  },

  // Look up a user by their unique auth ID.
  byAuthId(authId) {
    return this.byUnique(`auth#${authId}`);
  },

  // Look up a user by their unique email.
  byEmail(email) {
    return this.byUnique(`email#${String(email).toLowerCase()}`);
  },

  // Look up a user by their unique username.
  byUsername(username) {
    return this.byUnique(`username#${username}`);
  },

  // List all users in the table, handling pagination.
  async list() {
    const items = [];
    let ExclusiveStartKey;
    do {
      const page = await doc.send(
        new ScanCommand({ TableName: table.users, ExclusiveStartKey }),
      );
      items.push(...(page.Items ?? []));
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  },

  // Create a new user with unique constraints on auth_id, email, and username.
  async create(data) {
    const user = {
      role_id: null,
      password: null,
      ...data,
      user_id: randomUUID(),
      email: data.email.toLowerCase(),
      createdAt: now(),
    };
    // Ensure the email is in lowercase for uniqueness checks.
    await transact(
      [
        put(table.users, user, "attribute_not_exists(user_id)"),
        ...userKeys(user).map((key) => uniqueLock(key, user.user_id)),
      ],
      USER_CONFLICT,
    );

    return user;
  },

  async update(existing, patch) {
    const next = { ...existing, ...patch };
    if (patch.email) next.email = patch.email.toLowerCase();

    // Reserve new unique keys and release obsolete ones in the same write as
    // the profile update; unchanged keys must not be written twice.
    const before = new Set(userKeys(existing));
    const after = new Set(userKeys(next));

    const items = [
      put(table.users, next, "attribute_exists(user_id)"),
      ...[...after]
        .filter((key) => !before.has(key))
        .map((key) => uniqueLock(key, next.user_id)),
      ...[...before]
        .filter((key) => !after.has(key))
        .map((pk) => ({ Delete: { TableName: table.uniques, Key: { pk } } })),
    ];

    // Perform the transactional update, ensuring unique constraints are respected.
    await transact(items, "Email or username already exists");
    return next;
  },

  async remove(user) {
    await transact(
      [
        {
          Delete: {
            TableName: table.users,
            Key: { user_id: user.user_id },
          },
        },
        ...userKeys(user).map((pk) => ({
          Delete: { TableName: table.uniques, Key: { pk } },
        })),
      ],
      "Could not delete user",
    );
  },
};

// ---------------------------------------------------------------------------
// Groups and memberships
// ---------------------------------------------------------------------------

const MEMBER_NAMESPACE = "6f1d3c1e-3d0e-4f43-9a3c-1f0f4d7a7b11";

// Deterministic id: one membership per (group, user), enforced by a
// conditional put.
export const membershipId = (groupId, userId) =>
  uuidv5(`${groupId}:${userId}`, MEMBER_NAMESPACE);

const newMember = (group_id, user_id, role) => ({
  id: membershipId(group_id, user_id),
  group_id,
  user_id,
  role,
  createdAt: now(),
});

const generateInviteCode = () => randomBytes(5).toString("hex").toUpperCase();

// Groups
export const groups = {
  get: (id) => get(table.groups, { id }),

  getMany: (ids) => (ids.length ? batchGet(table.groups, "id", ids) : []),

  listByOwner: (ownerId) =>
    queryAll({
      TableName: table.groups,
      IndexName: "owner_id-index",
      KeyConditionExpression: "owner_id = :o",
      ExpressionAttributeValues: { ":o": ownerId },
    }),

  async byInviteCode(code) {
    const lock = await get(table.uniques, { pk: `invite#${code}` });
    return lock ? this.get(lock.ref_id) : null;
  },

  // Creates a new group with a unique invite code and assigns the owner as a member.
  async createWithOwner(name, ownerId) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const group = {
        id: randomUUID(),
        name,
        invite_code: generateInviteCode(),
        owner_id: ownerId,
        createdAt: now(),
      };

      // Attempt to create the group with a unique invite code.
      try {
        await doc.send(
          new TransactWriteCommand({
            TransactItems: [
              put(table.groups, group, "attribute_not_exists(id)"),
              put(table.members, newMember(group.id, ownerId, "owner")),
              uniqueLock(`invite#${group.invite_code}`, group.id),
            ],
          }),
        );
        return group;
      } catch (error) {
        // A canceled transaction is retried with a new generated group and code.
        if (error.name !== "TransactionCanceledException") throw error;
      }
    }
    throw new Error("Could not generate a unique invite code");
  },

  // Renames an existing group by updating its name attribute.
  async rename(id, name) {
    const res = await doc.send(
      new UpdateCommand({
        TableName: table.groups,
        Key: { id },
        UpdateExpression: "SET #n = :n",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeNames: { "#n": "name" },
        ExpressionAttributeValues: { ":n": name },
        ReturnValues: "ALL_NEW",
      }),
    );
    return res.Attributes;
  },

  // Deletes results, quizzes and memberships before the group and invite lock.
  // These separate operations are not atomic and can leave partial cleanup if
  // a request fails.
  async removeCascade(group) {
    const quizList = await quizzes.listByGroup(group.id);

    for (const quiz of quizList) {
      const results = await quizResults.listByQuiz(quiz.id);
      await batchDelete(
        table.results,
        results.map((r) => ({ id: r.id })),
      );
    }

    await batchDelete(
      table.quizzes,
      quizList.map((q) => ({ id: q.id })),
    );

    const members = await groupMembers.listByGroup(group.id);
    await batchDelete(
      table.members,
      members.map((m) => ({ id: m.id })),
    );

    await doc.send(
      new DeleteCommand({ TableName: table.groups, Key: { id: group.id } }),
    );
    await doc.send(
      new DeleteCommand({
        TableName: table.uniques,
        Key: { pk: `invite#${group.invite_code}` },
      }),
    );
  },
};

// Group members
export const groupMembers = {
  get: (id) => get(table.members, { id }),

  find: (groupId, userId) => get(table.members, { id: membershipId(groupId, userId) }),

  listByGroup: (groupId) =>
    queryAll({
      TableName: table.members,
      IndexName: "group_id-index",
      KeyConditionExpression: "group_id = :g",
      ExpressionAttributeValues: { ":g": groupId },
    }),

  listByUser: (userId) =>
    queryAll({
      TableName: table.members,
      IndexName: "user_id-index",
      KeyConditionExpression: "user_id = :u",
      ExpressionAttributeValues: { ":u": userId },
    }),

  // Adds a new member to the group with the specified role. Throws an error if the user is already a member.
  async add(groupId, userId, role = "member") {
    const member = newMember(groupId, userId, role);
    try {
      await doc.send(
        new PutCommand({
          TableName: table.members,
          Item: member,
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new HttpError(409, "You are already a member of this group");
      }
      throw error;
    }
    return member;
  },

  remove: (id) =>
    doc.send(new DeleteCommand({ TableName: table.members, Key: { id } })),
};

// ---------------------------------------------------------------------------
// Quizzes and results
// ---------------------------------------------------------------------------

export const quizzes = {
  get: (id) => get(table.quizzes, { id }),

  listByGroup: (groupId) =>
    queryAll({
      TableName: table.quizzes,
      IndexName: "group_id-index",
      KeyConditionExpression: "group_id = :g",
      ExpressionAttributeValues: { ":g": groupId },
      ScanIndexForward: false,
    }),

  // Creates a new quiz with a unique ID and timestamp.
  async create(data) {
    const quiz = { ...data, id: randomUUID(), createdAt: now() };
    await doc.send(new PutCommand({ TableName: table.quizzes, Item: quiz }));
    return quiz;
  },

  // Updates an existing quiz. Throws an error if the quiz does not exist.
  async save(quiz) {
    await doc.send(
      new PutCommand({
        TableName: table.quizzes,
        Item: quiz,
        ConditionExpression: "attribute_exists(id)",
      }),
    );
    return quiz;
  },

  // Delete results in batches before the quiz; the separate writes are not atomic.
  async removeCascade(quiz) {
    const results = await quizResults.listByQuiz(quiz.id);
    await batchDelete(
      table.results,
      results.map((r) => ({ id: r.id })),
    );
    await doc.send(
      new DeleteCommand({ TableName: table.quizzes, Key: { id: quiz.id } }),
    );
  },
};

// Quiz results
export const quizResults = {
  listByQuiz: (quizId) =>
    queryAll({
      TableName: table.results,
      IndexName: "quiz_id-index",
      KeyConditionExpression: "quiz_id = :q",
      ExpressionAttributeValues: { ":q": quizId },
    }),

  // Creates a new quiz result with a unique ID and timestamp.
  async create(data) {
    const result = { ...data, id: randomUUID(), createdAt: now() };
    await doc.send(new PutCommand({ TableName: table.results, Item: result }));
    return result;
  },
};
