import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.put("/quizzes/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    // Get user info from JWT token
    const userId = req.user.id;

    // Find the quiz
    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      return res.status(404).json({
        sms: ["Quiz not found"],
      });
    }

    // Verify that the user is the creator/owner of the quiz
    if (quiz.createdBy !== userId) {
      return res.status(403).json({
        sms: ["Only the quiz creator can update this quiz"],
      });
    }

    // Validate input
    if (!title || title.trim() === "") {
      return res.status(400).json({
        sms: ["Please provide quiz title"],
      });
    }

    // Update quiz
    await quiz.update({
      title: title.trim(),
      updatedAt: new Date(),
    });

    return res.status(200).json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        groupId: quiz.groupId,
        createdBy: quiz.createdBy,
        updatedAt: quiz.updatedAt,
      },
      sms: ["Quiz updated successfully"],
    });
  } catch (error) {
    console.error("Error updating quiz:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
