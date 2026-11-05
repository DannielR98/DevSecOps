import { HttpError, requireUUID, route } from "../lib/http.js";
import { groupMembers, groups } from "../lib/repo.js";

export const handler = route(async ({ params }) => {
  const groupId = requireUUID(params.groupId, "Invalid group ID format");

  if (!(await groups.get(groupId))) throw new HttpError(404, "Group not found");

  const members = await groupMembers.listByGroup(groupId);

  return [200, { success: true, group_id: groupId, members }];
});
