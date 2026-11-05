import { publicUser, route } from "../lib/http.js";
import { users } from "../lib/repo.js";

export const handler = route(async () => {
  const list = (await users.list()).map(publicUser);
  return [200, { success: true, count: list.length, users: list }];
});
