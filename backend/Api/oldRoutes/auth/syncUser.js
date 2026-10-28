import express from "express";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/supabaseAuth.js";

const router = express.Router();

router.post("/sync-user", checkJwt, async (req, res) => {
  try {
    const authId = req.auth.payload.sub;
    const { email, name, nickname } = req.body;

    let user = await User.findOne({
      where: {
        supabase_id: authId,
      },
    });

    if (!user && email) {
      // Check if user exists by email
      user = await User.findOne({ where: { email } });
      if (user) {
        user.supabase_id = authId;
        await user.save();
      }
    }

    if (!user) {
      // Create new local user synced from Supabase
      user = await User.create({
        supabase_id: authId,
        email: email || `${authId}@supabase.user`,
        username: nickname || name || email || authId,
        firstname: name ? name.split(" ")[0] : "Supabase",
        surname: name && name.split(" ").length > 1 ? name.split(" ").slice(1).join(" ") : "User",
      });
    }

    return res.status(200).json({
      message: "User synced successfully",
      user,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
