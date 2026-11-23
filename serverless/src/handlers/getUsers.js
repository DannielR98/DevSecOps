import { publicUser, route } from "../lib/http.js";
import { users } from "../lib/repo.js";

// The repository scans all user pages; never return stored password hashes.
export const handler = route(async () => {
  const list = (await users.list()).map(publicUser);
  return [200, { success: true, count: list.length, users: list }];
});
