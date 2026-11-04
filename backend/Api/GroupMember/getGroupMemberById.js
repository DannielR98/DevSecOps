import express from "express";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.get(
  "/groups/:groupId/members/:memberId",
  verifyJWT,
  async (req, res) => {
    try {
      const { groupId, memberId } = req.params;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(groupId) || !uuidRegex.test(memberId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid group ID or member ID format",
        });
      }

      // Find the logged-in database user.
      const tokenUserId = req.user?.id;
      const tokenEmail = req.user?.email;

      let currentUser = null;

      if (tokenUserId) {
        currentUser = await User.findByPk(tokenUserId);
      }

      if (!currentUser && tokenEmail) {
        currentUser = await User.findOne({
          where: { email: tokenEmail },
        });
      }

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const userId = currentUser.user_id ?? currentUser.id;

      // Confirm that the group exists.
      const group = await Group.findByPk(groupId);

      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Group not found",
        });
      }

      // Only group members can view member details.
      const currentMembership = await GroupMember.findOne({
        where: {
          group_id: groupId,
          user_id: userId,
        },
      });

      if (!currentMembership) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this group",
        });
      }

      // Find the requested membership.
      const member = await GroupMember.findOne({
        where: {
          id: memberId,
          group_id: groupId,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Group member not found",
        });
      }

      // Fetch user details separately to avoid requiring an association.
      const memberUser = await User.findByPk(member.user_id, {
        attributes: ["user_id", "firstname", "surname", "username", "email"],
      });

      return res.status(200).json({
        success: true,
        member: {
          id: member.id,
          group_id: member.group_id,
          user_id: member.user_id,
          role: member.role,
          createdAt: member.createdAt,
          user: memberUser
            ? {
              user_id: memberUser.user_id,
              firstname: memberUser.firstname,
              surname: memberUser.surname,
              username: memberUser.username,
              email: memberUser.email,
            }
            : null,
        },
      });
    } catch (error) {
      console.error("Error getting group member:", error);

      return res.status(500).json({
        success: false,
        message: "Could not get group member",
      });
    }
  },
);

export default router;
