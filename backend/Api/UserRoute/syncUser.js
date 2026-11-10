import express from "express";
import User from "../../models/User.js";
import checkJwt from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.post("/sync-user", checkJwt, async (req, res) => {
  try {
    const { name, nickname } = req.body;
    const { sub: auth_id, email } = req.auth.payload;

    if (!auth_id) {
      return res.status(400).json({
        success: false,
        message: "Authenticated user ID is required",
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

    const userData = user.toJSON();
    delete userData.password;

    return res.status(200).json({
      success: true,
      message: "User synced successfully",
      user: userData,
    });
  } catch (_error) {
    //console.error("Error syncing user:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to sync user",
    });
  }
});

export default router;
