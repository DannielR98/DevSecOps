import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import QuizResult from "../../../database/schemas/quizResultSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.post("/quizzes/:id/submit", checkJwt, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Answers array is required." });
    }

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ where: { auth0_id: auth0Id } });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const questions = quiz.questions || [];
    let score = 0;

    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score += 1;
      }
    });

    const result = await QuizResult.create({
      quiz_id: quizId,
      user_id: user.id,
      score,
      total_questions: questions.length,
    });

    return res.status(200).json({
      message: "Quiz submitted successfully!",
      result: {
        id: result.id,
        score,
        total_questions: questions.length,
        percentage: Math.round((score / (questions.length || 1)) * 100),
      },
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
