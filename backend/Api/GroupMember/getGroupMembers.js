/* import express from "express";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/groups/:groupId/members", verifyJWT, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Validate UUID format.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
      });
    }

    // Check that the group exists.
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Fetch membership records without a User association.
    const members = await GroupMember.findAll({
      where: { group_id: groupId },
    });

    return res.status(200).json({
      success: true,
      group_id: groupId,
      members,
    });
  } catch (error) {
    console.error("Error getting group members:", error);

    return res.status(500).json({
      success: false,
      message: "Could not get group members",
      error: error.message,
    });
  }
});

export default router;
 */

import express from "express";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.get("/groups/:groupId/members", checkJwt, async (req, res) => {
  try {
    const { groupId } = req.params;

    // 1. Validate group UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
      });
    }

    // 2. Get authenticated user from the Supabase JWT
    const authId = req.auth?.payload?.sub;
    const tokenEmail = req.auth?.payload?.email ?? req.user?.email;

    if (!authId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        message: "User information is missing from JWT",
      });
    }

    // 3. Find local user using auth_id
    let currentUser = null;

    if (authId) {
      currentUser = await User.findOne({
        where: { auth_id: authId },
      });
    }

    // Fallback: find user by email
    if (!currentUser && tokenEmail) {
      currentUser = await User.findOne({
        where: {
          email: {
            [Op.iLike]: tokenEmail,
          },
        },
      });
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User not found for this JWT",
      });
    }

    const userId = currentUser.user_id;

    if (userId == null) {
      return res.status(500).json({
        success: false,
        message: "Local user ID is missing",
      });
    }

    // 4. Check that the group exists
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // 5. Ensure the current user belongs to the group
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

    // 6. Fetch group members
    const members = await GroupMember.findAll({
      where: { group_id: groupId },
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      group_id: groupId,
      members,
    });
  } catch (error) {
    console.error("Error getting group members:",  error.message);
    // console.error("Database error:", error.original?.message);

    return res.status(500).json({
      success: false,
      message: "Could not get group members",
    });
  }
});

export default router;
