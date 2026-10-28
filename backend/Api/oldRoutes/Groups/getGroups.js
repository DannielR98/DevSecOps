import express from "express";
import { Op } from "sequelize";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/supabaseAuth.js";

const router = express.Router();

router.get("/groups", checkJwt, async (req, res) => {
  try {
    const supabaseId = req.auth.payload.sub;
    const user = await User.findOne({ where: { supabase_id: supabaseId } });

    if (!user) {
      return res.status(200).json({ groups: [] });
    }

    const memberEntries = await GroupMember.findAll({ where: { user_id: user.id } });
    const memberGroupIds = memberEntries.map((m) => m.group_id);

    const whereClause =
      memberGroupIds.length > 0
        ? { [Op.or]: [{ owner_id: user.id }, { id: memberGroupIds }] }
        : { owner_id: user.id };

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
        is_owner: group.owner_id === user.id,
        createdAt: group.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching groups:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
