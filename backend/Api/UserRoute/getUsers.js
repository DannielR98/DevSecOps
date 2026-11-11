import express from "express";
import User from "../../models/User.js";
import checkJwt from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.get("/users", checkJwt, async (_req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ["password"] } });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error fetching users", error.message);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

export default router;
