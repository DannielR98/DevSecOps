import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./database/database.js";

import registerUserRoute from "./Api/Routes/auth/registerUser.js";
import loginUserRoute from "./Api/Routes/auth/loginUser.js";
import getUsersRoute from "./Api/Routes/auth/getUser.js";
import getUserByIdRoute from "./Api/Routes/auth/getUserId.js";
import deleteUser from "./Api/Routes/auth/deleteUser.js";
import updateUser from "./Api/Routes/auth/updateUser.js";

import createGroup from "./Api/Routes/Groups/createGroup.js";
import getGroups from "./Api/Routes/Groups/getGroups.js";
import getGroupById from "./Api/Routes/Groups/getGroupById.js";
import deleteGroup from "./Api/Routes/Groups/deleteGroup.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// api user
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

async function start() {
  await db.sync();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Database connected successfully");
  });
}

if (process.env.NODE_ENV !== "test") {
  start();
}

export default app;