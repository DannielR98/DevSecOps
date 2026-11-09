import { HttpError, route } from "../lib/http.js";
import { groupMembers, groups } from "../lib/repo.js";
import { publicMember } from "../lib/shapes.js";

// Alternative join endpoint: it performs the same invite-code lookup but
// returns the created membership rather than the group.
export const handler = route(async ({ body, user }) => {
  const code = body.invite_code;
  if (typeof code !== "string" || code.trim() === "") {
    throw new HttpError(400, "Invite code is required");
  }

  const group = await groups.byInviteCode(code.trim().toUpperCase());
  if (!group) throw new HttpError(404, "Invalid invite code");

  const member = await groupMembers.add(group.id, user.user_id, "member");

  return [
    201,
    { success: true, message: "Joined group successfully", member: publicMember(member) },
  ];
});
