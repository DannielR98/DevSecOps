/* import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./database/database.js";
import "./database/associations.js";
// import routes
import getUsersRoute from "./Api/Routes/auth/getUser.js";
import getUserByIdRoute from "./Api/Routes/auth/getUserId.js";
import deleteUser from "./Api/Routes/auth/deleteUser.js";
import updateUser from "./Api/Routes/auth/updateUser.js";
import syncUserRoute from "./Api/Routes/auth/syncUser.js";

import createGroup from "./Api/Routes/Groups/createGroup.js";
import getGroups from "./Api/Routes/Groups/getGroups.js";
import getGroupById from "./Api/Routes/Groups/getGroupById.js";
import deleteGroup from "./Api/Routes/Groups/deleteGroup.js";
import joinGroup from "./Api/Routes/Groups/joinGroup.js";
import updateGroup from "./Api/Routes/Groups/updateGroup.js";

// import quiz routes
import createQuiz from "./Api/Routes/Quizzes/createQuiz.js";
import getQuizzes from "./Api/Routes/Quizzes/getQuizzes.js";
import getQuizById from "./Api/Routes/Quizzes/getQuizById.js";
import updateQuiz from "./Api/Routes/Quizzes/updateQuiz.js";
import deleteQuiz from "./Api/Routes/Quizzes/deleteQuiz.js";
import takeQuiz from "./Api/Routes/Quizzes/takeQuiz.js";

// import group remember
import joinGroupMember from "./Api/Routes/GroupMember/joinGroup.js";
import getGroupMembers from "./Api/Routes/GroupMember/getGroupMembers.js";
import getGroupMemberById from "./Api/Routes/GroupMember/getGroupMemberById.js";
import leaveGroup from "./Api/Routes/GroupMember/leaveGroup.js";

//
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

//api routes

// api user
app.use("/api", syncUserRoute);
app.use("/api", getUsersRoute);
app.use("/api", getUserByIdRoute);
app.use("/api", deleteUser);
app.use("/api", updateUser);

// api group
app.use("/api", createGroup);
app.use("/api", getGroups);
app.use("/api", getGroupById);
app.use("/api", deleteGroup);
app.use("/api", joinGroup);
app.use("/api", updateGroup);

// api quiz
app.use("/api", createQuiz);
app.use("/api", getQuizzes);
app.use("/api", getQuizById);
app.use("/api", updateQuiz);
app.use("/api", deleteQuiz);
app.use("/api", takeQuiz);

// api group remember
app.use("/api", joinGroupMember);
app.use("/api", getGroupMembers);
app.use("/api", getGroupMemberById);
app.use("/api", leaveGroup);
// Sync database models and start server
db.sync()
  .then(() => {
    console.log("Database synced successfully");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });

export default app; */

import express from "express";
import cors from "cors";
import "dotenv/config";
import { sequelize, connectDB } from "./config/connect.db.js";

// api for user

import registerUser from "./Api/UserRoute/registerUser.js";
import getUsers from "./Api/UserRoute/getUsers.js";
import getUserById from "./Api/UserRoute/getUserById.js";
import loginUser from "./Api/UserRoute/LoginUser.js";
import updateUser from "./Api/UserRoute/updateUser.js";
import deleteUser from "./Api/UserRoute/deleteUser.js";

// api for  Group
import createGroup from "./Api/Groups/createGroup.js";
import getGroups from "./Api/Groups/getGroups.js";
import getGroupById from "./Api/Groups/getGroupById.js";
import deleteGroup from "./Api/Groups/deleteGroup.js";
import updateGroup from "./Api/Groups/updateGroup.js";
import joinGroup from "./Api/Groups/joinGroup.js";

// api for  Group Member

import getGroupMembersRouter from "./Api/GroupMember/getGroupMembers.js";
import getGroupMemberByIdRouter from "./Api/GroupMember/getGroupMemberById.js";
import joinGroupMemberRouter from "./Api/GroupMember/joinGroup.js";
import leaveGroupRouter from "./Api/GroupMember/leaveGroup.js";

// api for  Quiz

import createQuizRouter from "./Api/Quizzes/createQuiz.js";
import getQuizzes from "./Api/Quizzes/getQuizzes.js";
import getQuizByIdRouter from "./Api/Quizzes/getQuizById.js";
import deleteQuizRouter from "./Api/Quizzes/deleteQuiz.js";
import updateQuizRouter from "./Api/Quizzes/updateQuiz.js";
import submitQuizRouter from "./Api/Quizzes/takeQuiz.js";
//

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//
// api user
app.use("/api", getUsers);
app.use("/api", getUserById);
app.use("/api", registerUser);
app.use("/api", loginUser);
app.use("/api", updateUser);
app.use("/api", deleteUser);

// api for  Group
app.use("/api", createGroup);
app.use("/api", getGroups);
app.use("/api", getGroupById);
app.use("/api", updateGroup);
app.use("/api", deleteGroup);
app.use("/api", joinGroup);

// api for  Group Member

app.use("/api", getGroupMembersRouter);
app.use("/api", getGroupMemberByIdRouter);
app.use("/api", joinGroupMemberRouter);
app.use("/api", leaveGroupRouter);

// api for  Quiz
app.use("/api", createQuizRouter);
app.use("/api", getQuizzes);
app.use("/api", getQuizByIdRouter);
app.use("/api", deleteQuizRouter);
app.use("/api", updateQuizRouter);
app.use("/api", submitQuizRouter);

//

async function startServer() {
  try {
    // Connect to PostgreSQL
    await connectDB();

    // Create tables / synchronize models for development only
    await sequelize.sync();

    console.log("Database synced successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}
const h = 5;
startServer();
