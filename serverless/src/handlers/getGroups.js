import { route } from "../lib/http.js";
import { groupMembers, groups } from "../lib/repo.js";
import { publicGroup } from "../lib/shapes.js";

// Membership and ownership are queried separately, then deduplicated because
// an owner can also have a membership record in the same group.
export const handler = route(async ({ user }) => {
  const userId = user.user_id;

  const [memberships, owned] = await Promise.all([
    groupMembers.listByUser(userId),
    groups.listByOwner(userId),
  ]);

  // Retrieve the full group details for the memberships and combine them with the owned groups.
  const memberGroups = await groups.getMany(memberships.map((m) => m.group_id));
  const all = new Map([...memberGroups, ...owned].map((g) => [g.id, g]));


  const list = [...all.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((group) => ({
      ...publicGroup(group),
      is_owner: group.owner_id === userId,
    }));

  return [200, { groups: list }];
});
