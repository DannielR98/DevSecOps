import express from "express";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.post("/sync-user", checkJwt, async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const { email, name, nickname } = req.body;

    let user = await User.findOne({ where: { auth0_id: auth0Id } });

    if (!user && email) {
      // Check if user exists by email
      user = await User.findOne({ where: { email } });
      if (user) {
        user.auth0_id = auth0Id;
        await user.save();
      }
    }

    if (!user) {
      // Create new local user synced from Auth0
      user = await User.create({
        auth0_id: auth0Id,
        email: email || `${auth0Id}@auth0.user`,
        username: nickname || name || email || auth0Id,
        firstname: name ? name.split(" ")[0] : "Auth0",
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
