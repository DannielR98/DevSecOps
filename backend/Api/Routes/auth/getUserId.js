import express from "express";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.get("/user/:userId", checkJwt, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        sms: ["User not found"],
      });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
