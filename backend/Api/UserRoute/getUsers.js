import express from "express";
import User from "../../models/User.js";

const router = express.Router();

router.get("/users", async (_req, res) => {
  try {
    const users = await User.findAll();
    console.log(users);

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

export default router;
