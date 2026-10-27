import express from "express";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import Quiz from "../../models/Quiz.js";
import QuizResult from "../../models/QuizResult.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.delete("/groups/:id", verifyJWT, async (req, res) => {
  try {
    const groupId = req.params.id;
    const tokenUserId = req.user?.id;
    const tokenEmail = req.user?.email;

    // Validate UUID group ID.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
      });
    }

    // Find the logged-in user in the database.
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
      return res.status(401).json({
        success: false,
        message: "User not found for this JWT",
      });
    }

    const userId = user.user_id ?? user.id;

    // Find the group.
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only the group owner may delete it.
    if (group.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this group",
      });
    }

    // Delete related records in a transaction.
    await Group.sequelize.transaction(async (transaction) => {
      const groupQuizzes = await Quiz.findAll({
        where: { group_id: groupId },
        attributes: ["id"],
        transaction,
      });

      const quizIds = groupQuizzes.map((quiz) => quiz.id);

      if (quizIds.length > 0) {
        await QuizResult.destroy({
          where: {
            quiz_id: {
              [Op.in]: quizIds,
            },
          },
          transaction,
        });
      }

      await GroupMember.destroy({
        where: { group_id: groupId },
        transaction,
      });

      await Quiz.destroy({
        where: { group_id: groupId },
        transaction,
      });

      await group.destroy({ transaction });
    });

    return res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting group:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete group",
    });
  }
});

export default router;
