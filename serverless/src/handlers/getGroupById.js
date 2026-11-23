import { HttpError, requireUUID, route } from "../lib/http.js";
import { groups } from "../lib/repo.js";
import { publicGroup } from "../lib/shapes.js";

// This authenticated route returns the public group shape for a valid ID.
export const handler = route(async ({ params }) => {
  const id = requireUUID(params.groupId, "Invalid group ID format");

  // Fetch the group by its ID and return its public shape.
  const group = await groups.get(id);
  if (!group) throw new HttpError(404, "Group not found");

  return [200, { success: true, group: publicGroup(group) }];
});
