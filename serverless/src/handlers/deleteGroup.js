import { HttpError, requireUUID, route } from "../lib/http.js";
import { groups } from "../lib/repo.js";

export const handler = route(async ({ params, user }) => {
  const id = requireUUID(params.groupId, "Invalid group ID format");

  const group = await groups.get(id);
  if (!group) throw new HttpError(404, "Group not found");

  if (group.owner_id !== user.user_id) {
    throw new HttpError(403, "You are not authorized to delete this group");
  }

  await groups.removeCascade(group);

  return [200, { success: true, message: "Group deleted successfully" }];
});
