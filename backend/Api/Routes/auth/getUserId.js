import express from "express";
import verifyJWT from "../../../middleware/verifyJWT.js";
import User from "../../../database/schemas/userSchema.js";

const router = express.Router();

router.get("/user/:userId", verifyJWT, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await User.findByPk(userId);
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
