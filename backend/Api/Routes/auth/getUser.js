import express from "express";

import User from "../../../database/schemas/userSchema.js";

const router = express.Router();

router.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
