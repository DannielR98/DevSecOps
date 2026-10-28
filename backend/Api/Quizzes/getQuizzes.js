import express from "express";
import { Op } from "sequelize";

import Quiz from "../../models/Quiz.js";
import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/quizzes", verifyJWT, async (req, res) => {
  try {
    // 1. Find the logged-in user from the JWT
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
      return res.status(200).json({ quizzes: [] });
    }

    const userId = user.user_id;

    // 2. Find groups the user belongs to
    const memberEntries = await GroupMember.findAll({
      where: { user_id: userId },
      attributes: ["group_id"],
    });

    const memberGroupIds = memberEntries.map((member) => member.group_id);

    // 3. Find groups the user owns
    const ownedGroups = await Group.findAll({
      where: { owner_id: userId },
      attributes: ["id", "name"],
    });

    const ownedGroupIds = ownedGroups.map((group) => group.id);

    // Combine owned and joined groups without duplicates
    const userGroupIds = [...new Set([...memberGroupIds, ...ownedGroupIds])];

    if (userGroupIds.length === 0) {
      return res.status(200).json({ quizzes: [] });
    }

    // 4. Optionally filter by group_id (UUID)
    const { group_id } = req.query;
    let targetGroupIds = userGroupIds;

    if (group_id !== undefined) {
      if (typeof group_id !== "string" || !group_id.trim()) {
        return res.status(400).json({
          success: false,
          message: "A valid group_id UUID is required",
        });
      }

      const requestedGroup = await Group.findByPk(group_id);

      if (!requestedGroup) {
        return res.status(404).json({
          success: false,
          message: "Group not found",
        });
      }

      if (!userGroupIds.includes(requestedGroup.id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this group's quizzes",
        });
      }

      targetGroupIds = [requestedGroup.id];
    }

    // 5. Fetch quizzes for the selected groups
    const quizzes = await Quiz.findAll({
      where: {
        group_id: { [Op.in]: targetGroupIds },
      },
      order: [["createdAt", "DESC"]],
    });

    // 6. Fetch group names for the response
    const groups = await Group.findAll({
      where: {
        id: { [Op.in]: targetGroupIds },
      },
      attributes: ["id", "name"],
    });

    const groupMap = Object.fromEntries(
      groups.map((group) => [group.id, group.name]),
    );

    // 7. Include group name and creator status
    const formattedQuizzes = quizzes.map((quiz) => {
      const plainQuiz = quiz.get({ plain: true });

      return {
        ...plainQuiz,
        group_name: groupMap[quiz.group_id] ?? "Okänd grupp",
        is_creator: quiz.creator_id === userId,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedQuizzes.length,
      quizzes: formattedQuizzes,
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch quizzes",
    });
  }
});

export default router;
