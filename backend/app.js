import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./database/database.js";

// import routes

import registerUserRoute from "./Api/Routes/auth/registerUser.js";
import loginUserRoute from "./Api/Routes/auth/loginUser.js";
import getUsersRoute from "./Api/Routes/auth/getUser.js";

//
dotenv.config();
await db.sync();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

//api routes
app.use("/api", getUsersRoute);
app.use("/api", registerUserRoute);
app.use("/api", loginUserRoute);

////
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Database connected successfully");
});
