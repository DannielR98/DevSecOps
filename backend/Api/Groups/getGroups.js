import express from "express";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/groups", verifyJWT, async (req, res) => {
  try {
    const tokenUserId = req.user?.id;
    const tokenEmail = req.user?.email;

    // Find the database user using the JWT claims.
    let user = null;

    if (tokenUserId) {
      user = await User.findByPk(tokenUserId);
    }

    // Fallback in case the token ID does not match the database primary key.
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

    const userId = user.user_id ?? user.id;

    // Find groups where the user is a member.
    const memberEntries = await GroupMember.findAll({
      where: { user_id: userId },
      attributes: ["group_id"],
    });

    const memberGroupIds = memberEntries.map((member) => member.group_id);

    // Include groups the user owns or belongs to.
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

    return res.status(200).json({
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        invite_code: group.invite_code,
        owner_id: group.owner_id,
        is_owner: group.owner_id === userId,
        createdAt: group.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching groups:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups",
    });
  }
});

export default router;
