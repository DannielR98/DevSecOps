import { HttpError, parseWith, requireUUID, route } from "../lib/http.js";
import { createGroupSchema } from "../lib/validation.js";
import { groups } from "../lib/repo.js";
import { publicGroup } from "../lib/shapes.js";

// Validate the replacement name and allow only the existing group owner to edit.
export const handler = route(async ({ params, body, user }) => {
  const id = requireUUID(params.groupId, "Invalid group ID format");
  const { name } = parseWith(createGroupSchema, body);

  const group = await groups.get(id);
  if (!group) throw new HttpError(404, "Group not found");

  // Only the owner may update the group details.
  if (group.owner_id !== user.user_id) {
    throw new HttpError(403, "Only the group owner can edit group details");
  }

  const updated = await groups.rename(id, name);

  return [
    200,
    { success: true, message: "Group updated successfully", group: publicGroup(updated) },
  ];
});
