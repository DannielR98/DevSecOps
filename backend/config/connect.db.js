import sequelize from "./database.js";

import User from "../models/User.js";
import Role from "../models/Role.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import Quiz from "../models/Quiz.js";
import QuizResult from "../models/QuizResult.js";

// User <-> Role
Role.hasMany(User, {
  as: "users",
  foreignKey: "role_id",
});

User.belongsTo(Role, {
  as: "role",
  foreignKey: "role_id",
});

// User <-> Group (owner)
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

// User <-> Quiz (creator)
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

// Database connection
export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Unable to connect to the database:", error.message);
    throw error;
  }
}

// Export models if needed elsewhere
export { sequelize, User, Role, Group, GroupMember, Quiz, QuizResult };

export default sequelize;
