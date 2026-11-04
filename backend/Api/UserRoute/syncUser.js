import express from "express";
import User from "../../models/User.js";

const router = express.Router();

router.post("/sync-user", async (req, res) => {
  try {
    const { auth_id, email, name, nickname } = req.body;

    if (!auth_id) {
      return res.status(400).json({
        success: false,
        message: "auth_id is required",
      });
    }

    let user = await User.findOne({
      where: { auth_id },
    });

    if (!user && email) {
      user = await User.findOne({
        where: { email },
      });

      if (user) {
        user.auth_id = auth_id;
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        auth_id,
        email: email || `${auth_id}@user.local`,
        username: nickname || name || email || auth_id,
        firstname: name ? name.split(" ")[0] : "User",
        surname:
          name && name.split(" ").length > 1
            ? name.split(" ").slice(1).join(" ")
            : "Member",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User synced successfully",
      user,
    });
  } catch (error) {
    console.error("Error syncing user:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to sync user",
    });
  }
});

export default router;
