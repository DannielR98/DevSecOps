import { publicUser, route } from "../lib/http.js";

export const handler = route(async ({ user }) => [
  200,
  { success: true, message: "User synced successfully", user: publicUser(user) },
]);
