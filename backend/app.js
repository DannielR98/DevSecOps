import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// import routes

import registerRoute from "./Api/Routes/auth/register.js";
import loginRoute from "./Api/Routes/auth/login.js";

//
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

//api routes

app.use("/api", registerRoute);
app.use("/api", loginRoute);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
