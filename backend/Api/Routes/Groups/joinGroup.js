import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.post("/groups/join", checkJwt, async (req, res) => {
  try {
    const { invite_code } = req.body;

    if (!invite_code || invite_code.trim() === "") {
      return res.status(400).json({ message: "Invite code is required." });
    }

    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ where: { auth0_id: auth0Id } });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const group = await Group.findOne({
      where: { invite_code: invite_code.trim().toUpperCase() },
    });

    if (!group) {
      return res.status(404).json({ message: "Invalid invite code. Group not found." });
    }

    // Check if already member
    const existing = await GroupMember.findOne({
      where: { group_id: group.id, user_id: user.id },
    });

    if (existing) {
      return res.status(400).json({ message: "You are already a member of this group." });
    }

    await GroupMember.create({
      group_id: group.id,
      user_id: user.id,
      role: "member",
    });

    return res.status(200).json({
      message: `Successfully joined group "${group.name}"!`,
      group,
    });
  } catch (error) {
    console.error("Error joining group:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
