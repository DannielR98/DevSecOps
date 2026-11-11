import express from "express";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.get("/groups", checkJwt, async (req, res) => {
  try {
    // 1. Get the authenticated Supabase user
    const authId = req.auth?.payload?.sub;
    const tokenEmail = req.auth?.payload?.email ?? req.user?.email;

    if (!authId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        message: "User information is missing from the JWT",
      });
    }

    // 2. Find the local user using the Supabase ID
    let user = null;

    if (authId) {
      user = await User.findOne({
        where: { auth_id: authId },
      });
    }

    // 3. Fall back to email if the Supabase ID has no match
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
      return res.status(200).json({
        groups: [],
      });
    }

    // 4. Use the local database user ID
    const userId = user.user_id;

    // 5. Find groups the user has joined
    const memberEntries = await GroupMember.findAll({
      where: { user_id: userId },
      attributes: ["group_id"],
    });

    const memberGroupIds = memberEntries.map((member) => member.group_id);

    // 6. Find groups the user owns or has joined
    const whereClause =
      memberGroupIds.length > 0
        ? {
          [Op.or]: [
            { owner_id: userId },
            { id: { [Op.in]: memberGroupIds } },
          ],
        }
        : { owner_id: userId };

    const groups = await Group.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    // 7. Return groups to the frontend
    return res.status(200).json({
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        invite_code: group.invite_code,
        owner_id: group.owner_id,
        is_owner: String(group.owner_id) === String(userId),
        createdAt: group.createdAt,
      })),
    });
  } catch (error) {
    console.error("❌ GET /groups failed", error.message);
    //console.error("Message:", error.message);
    //console.error("Database error:", error.original?.message);
    //console.error("SQL:", error.sql);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups",
    });
  }
});

export default router;
