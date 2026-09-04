import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./database/database.js";

// import routes

import registerUserRoute from "./Api/Routes/auth/registerUser.js";
import loginUserRoute from "./Api/Routes/auth/loginUser.js";
import getUsersRoute from "./Api/Routes/auth/getUser.js";
import getUserByIdRoute from "./Api/Routes/auth/getUserId.js";
import deleteUser from "./Api/Routes/auth/deleteUser.js";
import updateUser from "./Api/Routes/auth/updateUser.js";
import syncUserRoute from "./Api/Routes/auth/syncUser.js";

// import groups routes
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

//
dotenv.config();
await db.sync();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

//api routes

// api user
app.use("/api", syncUserRoute);
app.use("/api", getUsersRoute);
app.use("/api", registerUserRoute);
app.use("/api", loginUserRoute);
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

////
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Database connected successfully");
});
