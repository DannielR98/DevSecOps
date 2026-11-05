import { HttpError, requireUUID, route } from "../lib/http.js";
import { groupMembers, groups } from "../lib/repo.js";

export const handler = route(async ({ params, user }) => {
  const groupId = requireUUID(params.groupId, "Invalid group ID");

  const group = await groups.get(groupId);
  if (!group) throw new HttpError(404, "Group not found");

  if (group.owner_id === user.user_id) {
    throw new HttpError(
      400,
      "Group owner cannot leave the group. Transfer ownership first.",
    );
  }

  const member = await groupMembers.find(groupId, user.user_id);
  if (!member) throw new HttpError(404, "You are not a member of this group");

  await groupMembers.remove(member.id);

  return [200, { success: true, message: "You left the group successfully" }];
});
