import { HttpError, isUUID, publicUser, route } from "../lib/http.js";
import { groupMembers, groups, users } from "../lib/repo.js";
import { publicMember } from "../lib/shapes.js";

// Require the caller's membership and ensure the requested membership belongs
// to this group before returning its selected profile fields.
export const handler = route(async ({ params, user }) => {
  const { groupId, memberId } = params;

  // Validate the format of the group and member IDs.
  if (!isUUID(groupId) || !isUUID(memberId)) {
    throw new HttpError(400, "Invalid group ID or member ID format");
  }

  // Ensure the group exists before proceeding.
  if (!(await groups.get(groupId))) throw new HttpError(404, "Group not found");

  // Ensure the caller is a member of the group.
  if (!(await groupMembers.find(groupId, user.user_id))) {
    throw new HttpError(403, "You are not a member of this group");
  }

  // Fetch the requested group member and ensure they belong to the group.
  const member = await groupMembers.get(memberId);
  if (!member || member.group_id !== groupId) {
    throw new HttpError(404, "Group member not found");
  }

  // Fetch the user associated with the group member to include their public profile.
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
