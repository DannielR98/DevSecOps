import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/quizzes", verifyJWT, async (req, res) => {
  try {
    const { groupId } = req.query;

    // Validate groupId parameter
    if (!groupId) {
      return res.status(400).json({
        sms: ["Please provide groupId as a query parameter"],
      });
    }

    // Get user info from JWT token
    const userId = req.user.id;

    // Verify that the user is a member of the group
    const groupMember = await GroupMember.findOne({
      where: {
        userId,
        groupId,
      },
    });

    if (!groupMember) {
      return res.status(403).json({
        sms: ["You are not a member of this group"],
      });
    }

    // Get all quizzes for the group
    const quizzes = await Quiz.findAll({
      where: {
        groupId,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        groupId: quiz.groupId,
        createdBy: quiz.createdBy,
        createdAt: quiz.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
