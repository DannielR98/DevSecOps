/* import express from "express";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.post("/group-members/join", verifyJWT, async (req, res) => {
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

    // Identify the logged-in user.
    const tokenUserId = req.user?.id;
    const tokenEmail = req.user?.email;

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

    // Find the group by invite code.
    const group = await Group.findOne({
      where: {
        invite_code: normalizedCode,
      },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code",
      });
    }

    // Prevent duplicate memberships.
    const existingMember = await GroupMember.findOne({
      where: {
        group_id: group.id,
        user_id: userId,
      },
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this group",
      });
    }

    // Create membership.
    const member = await GroupMember.create({
      group_id: group.id,
      user_id: userId,
      role: "member",
    });

    return res.status(201).json({
      success: true,
      message: "Joined group successfully",
      member: {
        id: member.id,
        group_id: member.group_id,
        user_id: member.user_id,
        role: member.role,
        createdAt: member.createdAt,
      },
    });
  } catch (error) {
    console.error("Error joining group:", error);

    return res.status(500).json({
      success: false,
      message: "Could not join group",
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

router.post("/group-members/join", checkJwt, async (req, res) => {
  try {
    // 1. Validate invite code
    const { invite_code } = req.body;

    if (typeof invite_code !== "string" || invite_code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Invite code is required",
      });
    }

    const normalizedCode = invite_code.trim().toUpperCase();

    // 2. Identify authenticated user from Supabase JWT
    const authId = req.auth?.payload?.sub;
    const tokenEmail = req.auth?.payload?.email ?? req.user?.email;

    if (!authId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        message: "User information is missing from JWT",
      });
    }

    // 3. Find local user using auth_id
    let user = null;

    if (authId) {
      user = await User.findOne({
        where: { auth_id: authId },
      });
    }

    // Fallback: find user by email
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

    const userId = user.user_id;

    if (userId == null) {
      return res.status(500).json({
        success: false,
        message: "Local user ID is missing",
      });
    }

    // 4. Find group using invite code
    const group = await Group.findOne({
      where: {
        invite_code: normalizedCode,
      },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code",
      });
    }

    // 5. Prevent duplicate memberships
    const existingMember = await GroupMember.findOne({
      where: {
        group_id: group.id,
        user_id: userId,
      },
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this group",
      });
    }

    // 6. Create membership
    const member = await GroupMember.create({
      group_id: group.id,
      user_id: userId,
      role: "member",
    });

    // 7. Return membership details
    return res.status(201).json({
      success: true,
      message: "Joined group successfully",
      member: {
        id: member.id,
        group_id: member.group_id,
        user_id: member.user_id,
        role: member.role,
        createdAt: member.createdAt,
      },
    });
  } catch (_error) {
    //console.error("Error joining group:", error);
    //console.error("Database error:", error.original?.message);

    return res.status(500).json({
      success: false,
      message: "Could not join group",
    });
  }
});

export default router;
