import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.delete("/groups/:groupId/members/leave", checkJwt, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);

    // Check group ID
    if (Number.isNaN(groupId)) {
      return res.status(400).json({
        sms: ["Invalid group ID"],
      });
    }

    // Get logged-in user from Auth0
    const auth0Id = req.auth.payload.sub;

    // Find user in database
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

    // Find group
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        sms: ["Group not found"],
      });
    }

    // Owner cannot leave
    if (group.owner_id === user.id) {
      return res.status(400).json({
        sms: ["Group owner cannot leave the group. Transfer ownership first."],
      });
    }

    // Find current user's membership
    const member = await GroupMember.findOne({
      where: {
        group_id: groupId,
        user_id: user.id,
      },
    });

    if (!member) {
      return res.status(404).json({
        sms: ["You are not a member of this group"],
      });
    }

    // Remove the current user's membership
    await member.destroy();

    return res.status(200).json({
      sms: ["You left the group successfully"],
    });
  } catch (error) {
    console.error("Error leaving group:", error);

    return res.status(500).json({
      sms: ["Could not leave group"],
      error: error.message,
    });
  }
});

export default router;
