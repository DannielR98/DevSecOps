
import express from "express";
import { Op } from "sequelize";

import Quiz from "../../models/Quiz.js";
import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/quizzes/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;

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
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = user.user_id;

    // 2. Find the quiz
    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // 3. Confirm the group exists
    const group = await Group.findByPk(quiz.group_id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Quiz group not found",
      });
    }

    // 4. Check whether the user is a member or the group owner
    const [membership, isOwner] = await Promise.all([
      GroupMember.findOne({
        where: {
          user_id: userId,
          group_id: quiz.group_id,
        },
      }),
      Promise.resolve(group.owner_id === userId),
    ]);

    if (!membership && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // 5. Return the quiz
    return res.status(200).json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        group_id: quiz.group_id,
        creator_id: quiz.creator_id,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching quiz by ID:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch quiz",
    });
  }
});

export default router;
