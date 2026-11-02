import { parseWith, route } from "../lib/http.js";
import { createGroupSchema } from "../lib/validation.js";
import { groups } from "../lib/repo.js";
import { publicGroup } from "../lib/shapes.js";

export const handler = route(async ({ body, user }) => {
  const { name } = parseWith(createGroupSchema, body);
  const group = await groups.createWithOwner(name, user.user_id);

  return [
    201,
    { success: true, message: "Group created successfully", group: publicGroup(group) },
  ];
});
