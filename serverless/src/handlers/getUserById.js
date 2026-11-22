/* import { HttpError, publicUser, requireUUID, route } from "../lib/http.js";
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
 */

import { HttpError, publicUser, requireUUID, route } from "../lib/http.js";
import { users } from "../lib/repo.js";

// Authenticated users can only access their own profile.
export const handler = route(async ({ params, user }) => {
  const id = requireUUID(
    params.user_id,
    "Invalid user ID. A valid UUID is required.",
  );

  // Get the authenticated user's database ID.
  const authenticatedUserId = user?.user_id;

  if (!authenticatedUserId) {
    throw new HttpError(401, "Invalid authentication token");
  }

  // Prevent users from accessing another user's profile.
  if (String(authenticatedUserId) !== String(id)) {
    throw new HttpError(403, "You are not authorized to access this profile");
  }

  const profile = await users.get(id);

  if (!profile) {
    throw new HttpError(404, "User not found");
  }

  return [200, { success: true, user: publicUser(profile) }];
});
