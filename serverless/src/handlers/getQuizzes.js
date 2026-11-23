import { HttpError, route } from "../lib/http.js";
import { groupMembers, groups, quizzes } from "../lib/repo.js";

// Resolve accessible groups from both membership and ownership, optionally
// restrict to one group, then merge and sort each group's indexed quiz list.
export const handler = route(async ({ query, user }) => {
  const userId = user.user_id;
  let targetIds;

  if (query.group_id !== undefined) {
    if (typeof query.group_id !== "string" || !query.group_id.trim()) {
      throw new HttpError(400, "A valid group_id UUID is required");
    }
    const group = await groups.get(query.group_id);
    if (!group) {
      throw new HttpError(404, "Group not found");
    }
    if (group.owner_id !== userId && !(await groupMembers.find(group.id, userId))) {
      throw new HttpError(403, "You do not have access to this group's quizzes");
    }
    targetIds = [group.id];
  } else {
    const [memberships, owned] = await Promise.all([
      groupMembers.listByUser(userId),
      groups.listByOwner(userId),
    ]);

    // Compile a list of group IDs the user can access through membership or ownership.
    targetIds = [
      ...new Set([
        ...memberships.map((membership) => membership.group_id),
        ...owned.map((group) => group.id),
      ]),
    ];
    if (targetIds.length === 0) return [200, { quizzes: [] }];
  }

  // Fetch group details and quizzes concurrently.
  const [groupList, quizLists] = await Promise.all([
    groups.getMany(targetIds),
    Promise.all(targetIds.map((id) => quizzes.listByGroup(id))),
  ]);

  // Map group IDs to their names for easy lookup when annotating quizzes.
  const groupNames = Object.fromEntries(groupList.map((g) => [g.id, g.name]));

  // Annotate quizzes with group names and creator status.
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
