import { publicUser, route } from "../lib/http.js";

// route() authenticates and provisions a profile if needed. No identity data
// from the request body is used to select the returned user.
export const handler = route(async ({ user }) => [
  200,
  { success: true, message: "User synced successfully", user: publicUser(user) },
]);
