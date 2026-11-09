import { HttpError, publicUser, requireUUID, route } from "../lib/http.js";
import { users } from "../lib/repo.js";

// Authenticated callers can look up a profile; publicUser removes its password.
export const handler = route(async ({ params }) => {
  const id = requireUUID(
    params.user_id,
    "Invalid user ID. A valid UUID is required.",
  );

  const user = await users.get(id);
  if (!user) throw new HttpError(404, "User not found");

  return [200, { success: true, user: publicUser(user) }];
});
