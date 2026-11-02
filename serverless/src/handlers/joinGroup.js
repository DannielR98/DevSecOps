import { HttpError, route } from "../lib/http.js";
import { groupMembers, groups } from "../lib/repo.js";
import { publicGroup } from "../lib/shapes.js";

export const handler = route(async ({ body, user }) => {
  const code = body.invite_code;
  if (typeof code !== "string" || code.trim() === "") {
    throw new HttpError(400, "Invite code is required");
  }

  const group = await groups.byInviteCode(code.trim().toUpperCase());
  if (!group) throw new HttpError(404, "Invalid invite code. Group not found");

  await groupMembers.add(group.id, user.user_id, "member");

  return [
    200,
    {
      success: true,
      message: `Successfully joined group "${group.name}"`,
      group: publicGroup(group),
    },
  ];
});
