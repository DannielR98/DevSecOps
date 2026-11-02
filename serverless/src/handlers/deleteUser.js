import { HttpError, requireUUID, route } from "../lib/http.js";
import { users } from "../lib/repo.js";

export const handler = route(async ({ params, user }) => {
  const id = requireUUID(params.user_id, "Invalid user ID");

  if (user.user_id !== id) {
    throw new HttpError(403, "You are not authorized to delete this user");
  }

  await users.remove(user);

  return [200, { success: true, message: "User deleted successfully" }];
});
