import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.get("/quizzes", checkJwt, async (req, res) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ where: { auth0_id: auth0Id } });

    if (!user) {
      return res.status(200).json({ quizzes: [] });
    }

    // Find all groups the user owns or is a member of
    const memberEntries = await GroupMember.findAll({ where: { user_id: user.id } });
    const memberGroupIds = memberEntries.map((m) => m.group_id);

    const ownedGroups = await Group.findAll({ where: { owner_id: user.id } });
    const ownedGroupIds = ownedGroups.map((g) => g.id);

    const userGroupIds = Array.from(new Set([...memberGroupIds, ...ownedGroupIds]));

    if (userGroupIds.length === 0) {
      return res.status(200).json({ quizzes: [] });
    }

    const { group_id } = req.query;

    let targetGroupIds = userGroupIds;
    if (group_id) {
      const requestedId = parseInt(group_id, 10);
      if (!userGroupIds.includes(requestedId)) {
        return res.status(200).json({ quizzes: [] });
      }
      targetGroupIds = [requestedId];
    }

    const quizzes = await Quiz.findAll({
      where: {
        group_id: targetGroupIds,
      },
      order: [["createdAt", "DESC"]],
    });

    const groups = await Group.findAll({
      where: { id: userGroupIds },
    });
    const groupMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

    const formattedQuizzes = quizzes.map((quiz) => {
      const plainObj = typeof quiz.get === "function" ? quiz.get({ plain: true }) : quiz;
      return {
        ...plainObj,
        group_name: groupMap[quiz.group_id] || "Okänd grupp",
        is_creator: quiz.creator_id === user.id,
      };
    });

    return res.status(200).json({ quizzes: formattedQuizzes });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
