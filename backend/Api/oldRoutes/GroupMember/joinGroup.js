import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.post("/group-members/join", checkJwt, async (req, res) => {
  try {
    const { invite_code } = req.body;

    if (!invite_code || invite_code.trim() === "") {
      return res.status(400).json({
        sms: ["Invite code is required"],
      });
    }

    const auth0Id = req.auth.payload.sub;

    const user = await User.findOne({
      where: {
        auth0_id: auth0Id,
      },
    });

    if (!user) {
      return res.status(404).json({
        sms: ["User not found"],
      });
    }

    const group = await Group.findOne({
      where: {
        invite_code: invite_code.trim().toUpperCase(),
      },
    });

    if (!group) {
      return res.status(404).json({
        sms: ["Invalid invite code"],
      });
    }

    const existingMember = await GroupMember.findOne({
      where: {
        group_id: group.id,
        user_id: user.id,
      },
    });

    if (existingMember) {
      return res.status(409).json({
        sms: ["You are already a member of this group"],
      });
    }

    const member = await GroupMember.create({
      group_id: group.id,
      user_id: user.id,
      role: "member",
    });

    return res.status(201).json({
      sms: ["Joined group successfully"],
      member: {
        id: member.id,
        group_id: member.group_id,
        user_id: member.user_id,
        role: member.role,
      },
    });
  } catch (error) {
    console.error("Error joining group:", error);

    return res.status(500).json({
      sms: ["Could not join group"],
      error: error.message,
    });
  }
});

export default router;
