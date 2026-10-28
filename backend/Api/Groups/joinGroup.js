import express from "express";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.post("/groups/join", verifyJWT, async (req, res) => {
  try {
    const { invite_code } = req.body;

    // Validate invite code.
    if (typeof invite_code !== "string" || invite_code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Invite code is required",
      });
    }

    const normalizedCode = invite_code.trim().toUpperCase();
    const tokenUserId = req.user?.id;
    const tokenEmail = req.user?.email;

    // Find the logged-in database user.
    let user = null;

    if (tokenUserId) {
      user = await User.findByPk(tokenUserId);
    }

    if (!user && tokenEmail) {
      user = await User.findOne({
        where: {
          email: {
            [Op.iLike]: tokenEmail,
          },
        },
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = user.user_id ?? user.id;

    // Find group using its invite code.
    const group = await Group.findOne({
      where: { invite_code: normalizedCode },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code. Group not found",
      });
    }

    // Check whether the user is already a member.
    const existingMembership = await GroupMember.findOne({
      where: {
        group_id: group.id,
        user_id: userId,
      },
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this group",
      });
    }

    // Add the user to the group.
    await GroupMember.create({
      group_id: group.id,
      user_id: userId,
      role: "member",
    });

    return res.status(200).json({
      success: true,
      message: `Successfully joined group "${group.name}"`,
      group: {
        id: group.id,
        name: group.name,
        invite_code: group.invite_code,
        owner_id: group.owner_id,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    console.error("Error joining group:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to join group",
    });
  }
});

export default router;
