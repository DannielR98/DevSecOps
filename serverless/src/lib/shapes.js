// Explicit response shapes keep group and membership output independent of
// additional fields that may later be stored in DynamoDB.
export const publicGroup = (group) => ({
  id: group.id,
  name: group.name,
  invite_code: group.invite_code,
  owner_id: group.owner_id,
  createdAt: group.createdAt,
});

// Explicit response shape for group members.
export const publicMember = (member) => ({
  id: member.id,
  group_id: member.group_id,
  user_id: member.user_id,
  role: member.role,
  createdAt: member.createdAt,
});
