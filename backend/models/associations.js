import User from "./User.js";
import Group from "./Group.js";
import GroupMember from "./GroupMember.js";
import Quiz from "./Quiz.js";
import QuizResult from "./QuizResult.js";

// User <-> Group: group owner
User.hasMany(Group, {
  as: "ownedGroups",
  foreignKey: "owner_id",
  sourceKey: "user_id",
});

Group.belongsTo(User, {
  as: "owner",
  foreignKey: "owner_id",
  targetKey: "user_id",
});

// User <-> GroupMember
User.hasMany(GroupMember, {
  as: "groupMemberships",
  foreignKey: "user_id",
  sourceKey: "user_id",
});

GroupMember.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  targetKey: "user_id",
});

// Group <-> GroupMember
Group.hasMany(GroupMember, {
  as: "memberships",
  foreignKey: "group_id",
});

GroupMember.belongsTo(Group, {
  as: "group",
  foreignKey: "group_id",
});

// Group <-> Quiz
Group.hasMany(Quiz, {
  as: "quizzes",
  foreignKey: "group_id",
});

Quiz.belongsTo(Group, {
  as: "group",
  foreignKey: "group_id",
});

// User <-> Quiz: quiz creator
User.hasMany(Quiz, {
  as: "createdQuizzes",
  foreignKey: "creator_id",
  sourceKey: "user_id",
});

Quiz.belongsTo(User, {
  as: "creator",
  foreignKey: "creator_id",
  targetKey: "user_id",
});

// Quiz <-> QuizResult
Quiz.hasMany(QuizResult, {
  as: "results",
  foreignKey: "quiz_id",
});

QuizResult.belongsTo(Quiz, {
  as: "quiz",
  foreignKey: "quiz_id",
});

// User <-> QuizResult
User.hasMany(QuizResult, {
  as: "quizResults",
  foreignKey: "user_id",
  sourceKey: "user_id",
});

QuizResult.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  targetKey: "user_id",
});

export { User, Group, GroupMember, Quiz, QuizResult };
