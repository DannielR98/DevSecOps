import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import QuizQuestion from "../../../database/schemas/quizQuestionSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/quizzes/:id", verifyJWT, async (req, res) => {
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

    // Verify that the user is a member of the group
    const groupMember = await GroupMember.findOne({
      where: {
        userId,
        groupId: quiz.groupId,
      },
    });

    if (!groupMember) {
      return res.status(403).json({
        sms: ["You are not a member of this group"],
      });
    }

    // Get all questions for this quiz
    const questions = await QuizQuestion.findAll({
      where: {
        quizId: id,
      },
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        groupId: quiz.groupId,
        createdBy: quiz.createdBy,
        createdAt: quiz.createdAt,
        questions: questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;