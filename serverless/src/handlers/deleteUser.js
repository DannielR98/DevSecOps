import { HttpError, requireUUID } from "../lib/http.js";
import { users } from "../lib/repo.js";
//import { removeUserSubscriptions } from "../lib/notificationMembership.js";

// Users can only delete their own profile and unique keys.
// This does not delete the Supabase Auth account.
export const handler = route(async ({ params, user }) => {
  const id = requireUUID(params.user_id, "Invalid user ID");

  if (!user?.user_id) {
    throw new HttpError(401, "Invalid authentication token");
  }

  // Prevent deleting another user's profile.
  if (String(user.user_id) !== String(id)) {
    throw new HttpError(403, "You are not authorized to delete this user");
  }

  // Get the complete user record from DynamoDB.
  const existingUser = await users.get(id);

  if (!existingUser) {
    throw new HttpError(404, "User not found");
  }

  // Use the existing repo.js function without changing it.
  await users.remove(existingUser);

  return [
    200,
    {
      success: true,
      message: "User deleted successfully",
    },
  ];
});
