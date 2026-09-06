import User from "./schemas/userSchema.js";
import Group from "./schemas/groupSchema.js";
import GroupMember from "./schemas/groupMemberSchema.js";

GroupMember.belongsTo(User, {
  foreignKey: "user_id",
});

User.hasMany(GroupMember, {
  foreignKey: "user_id",
});

GroupMember.belongsTo(Group, {
  foreignKey: "group_id",
});

Group.hasMany(GroupMember, {
  foreignKey: "group_id",
});

export { User, Group, GroupMember };
