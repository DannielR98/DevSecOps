import express from "express";
import { z } from "zod";
import User from "../../models/User.js";

const router = express.Router();

const userIdSchema = z.uuid();

router.get("/user/:user_id", async (req, res) => {
  const validation = userIdSchema.safeParse(req.params.user_id);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID. A valid UUID is required.",
    });
  }

  try {
    const user = await User.findOne({
      where: {
        user_id: validation.data,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

export default router;
