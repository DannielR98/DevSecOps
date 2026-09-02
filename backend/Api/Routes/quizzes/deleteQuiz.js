import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import QuizQuestion from "../../../database/schemas/quizQuestionSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.delete("/quizzes/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;

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
        sms: ["Only the quiz creator can delete this quiz"],
      });
    }

    // Delete all questions associated with this quiz first
    await QuizQuestion.destroy({
      where: {
        quizId: id,
      },
    });

    // Delete the quiz
    await quiz.destroy();

    return res.status(200).json({
      sms: ["Quiz deleted successfully"],
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
