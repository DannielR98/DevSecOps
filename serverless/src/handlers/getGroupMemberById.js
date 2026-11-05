import { HttpError, isUUID, publicUser, route } from "../lib/http.js";
import { groupMembers, groups, users } from "../lib/repo.js";
import { publicMember } from "../lib/shapes.js";

export const handler = route(async ({ params, user }) => {
  const { groupId, memberId } = params;

  if (!isUUID(groupId) || !isUUID(memberId)) {
    throw new HttpError(400, "Invalid group ID or member ID format");
  }

  if (!(await groups.get(groupId))) throw new HttpError(404, "Group not found");

  if (!(await groupMembers.find(groupId, user.user_id))) {
    throw new HttpError(403, "You are not a member of this group");
  }

  const member = await groupMembers.get(memberId);
  if (!member || member.group_id !== groupId) {
    throw new HttpError(404, "Group member not found");
  }

  const memberUser = await users.get(member.user_id);
  const { user_id, firstname, surname, username, email } = memberUser
    ? publicUser(memberUser)
    : {};

  return [
    200,
    {
      success: true,
      member: {
        ...publicMember(member),
        user: memberUser ? { user_id, firstname, surname, username, email } : null,
      },
    },
  ];
});
