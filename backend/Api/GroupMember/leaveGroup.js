import express from "express";
import { validate as isUUID } from "uuid";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.delete("/groups/:groupId/members/leave", verifyJWT, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Validate UUID group ID
    if (!isUUID(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    // Find the logged-in user using your JWT payload
    const tokenUserId = req.user?.id;
    const tokenEmail = req.user?.email;

    let user = null;

    if (tokenUserId) {
      user = await User.findByPk(tokenUserId);
    }

    if (!user && tokenEmail) {
      user = await User.findOne({
        where: {
          email: { [Op.iLike]: tokenEmail },
        },
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = user.user_id;

    // Find the group
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // The owner cannot leave their own group
    if (group.owner_id === userId) {
      return res.status(400).json({
        success: false,
        message:
          "Group owner cannot leave the group. Transfer ownership first.",
      });
    }

    // Find the current user's membership
    const member = await GroupMember.findOne({
      where: {
        group_id: groupId,
        user_id: userId,
      },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Remove the membership
    await member.destroy();

    return res.status(200).json({
      success: true,
      message: "You left the group successfully",
    });
  } catch (error) {
    console.error("Error leaving group:", error);

    return res.status(500).json({
      success: false,
      message: "Could not leave group",
    });
  }
});

export default router;
