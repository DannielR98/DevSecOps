import { HttpError, route } from "../lib/http.js";
import { groupMembers, groups, quizzes } from "../lib/repo.js";

// Resolve accessible groups from both membership and ownership, optionally
// restrict to one group, then merge and sort each group's indexed quiz list.
export const handler = route(async ({ query, user }) => {
  const userId = user.user_id;

  const [memberships, owned] = await Promise.all([
    groupMembers.listByUser(userId),
    groups.listByOwner(userId),
  ]);

  // Compile a list of group IDs the user has access to, either through membership or ownership.
  const userGroupIds = [
    ...new Set([...memberships.map((m) => m.group_id), ...owned.map((g) => g.id)]),
  ];

  // If the user has no accessible groups, return an empty quiz list immediately.
  if (userGroupIds.length === 0) return [200, { quizzes: [] }];

  let targetIds = userGroupIds;

  // If a specific group ID is provided in the query, validate it and restrict the target IDs accordingly.
  if (query.group_id !== undefined) {
    if (typeof query.group_id !== "string" || !query.group_id.trim()) {
      throw new HttpError(400, "A valid group_id UUID is required");
    }
    if (!(await groups.get(query.group_id))) {
      throw new HttpError(404, "Group not found");
    }
    if (!userGroupIds.includes(query.group_id)) {
      throw new HttpError(403, "You do not have access to this group's quizzes");
    }
    targetIds = [query.group_id];
  }

  const [groupList, quizLists] = await Promise.all([
    groups.getMany(targetIds),
    Promise.all(targetIds.map((id) => quizzes.listByGroup(id))),
  ]);

  const groupNames = Object.fromEntries(groupList.map((g) => [g.id, g.name]));

  const list = quizLists
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((quiz) => ({
      ...quiz,
      group_name: groupNames[quiz.group_id] ?? "Okänd grupp",
      is_creator: quiz.creator_id === userId,
    }));

  return [200, { success: true, count: list.length, quizzes: list }];
});
