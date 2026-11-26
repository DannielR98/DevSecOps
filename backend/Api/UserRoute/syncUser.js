import express from "express";
import User from "../../models/User.js";
import { checkJwtForSync } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.post("/sync-user", checkJwtForSync, async (req, res) => {
  try {
    const { name, nickname } = req.body;
    const { sub: auth_id, email } = req.auth.payload;

    if (!auth_id) {
      return res.status(400).json({
        success: false,
        message: "Authenticated user ID is required",
      });
    }

    let user = req.dbUser;

    if (!user) {
      user = await User.create({
        auth_id,
        identity_provider: "supabase",
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
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      try {
        const existing = await User.findOne({
          where: { auth_id: req.auth.payload.sub },
        });
        if (existing?.identity_provider === "supabase") {
          const userData = existing.toJSON();
          delete userData.password;
          return res.status(200).json({ success: true, message: "User synced successfully", user: userData });
        }
      } catch (lookupError) {
        console.error("Error resolving profile conflict:", lookupError.message);
        return res.status(500).json({ success: false, message: "Failed to sync user" });
      }
      return res.status(409).json({ success: false, message: "Profile conflicts with an existing account" });
    }
    console.error("Error syncing user:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to sync user",
    });
  }
});

export default router;
