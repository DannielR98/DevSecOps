import express from "express";
import { Op } from "sequelize";
import Quiz from "../../models/Quiz.js";
import QuizResult from "../../models/QuizResult.js";
import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.post("/quizzes/:id/submit", verifyJWT, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;

    // 1. Validate the answers array
    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers array is required",
      });
    }

    // 2. Find the logged-in user from the JWT
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

    // 3. Find the quiz
    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // 4. Verify group membership or ownership
    const group = await Group.findByPk(quiz.group_id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Quiz group not found",
      });
    }

    const [membership, isOwner] = await Promise.all([
      GroupMember.findOne({
        where: {
          group_id: quiz.group_id,
          user_id: userId,
        },
      }),
      Promise.resolve(group.owner_id === userId),
    ]);

    if (!membership && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this group to submit the quiz",
      });
    }

    // 5. Calculate the score
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This quiz has no questions",
      });
    }

    let score = 0;

    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score += 1;
      }
    });

    const percentage = Math.round((score / questions.length) * 100);

    // 6. Save the quiz result
    const result = await QuizResult.create({
      quiz_id: quiz.id,
      user_id: userId,
      score,
      total_questions: questions.length,
    });

    // 7. Return the result
    return res.status(201).json({
      success: true,
      message: "Quiz submitted successfully",
      result: {
        id: result.id,
        quiz_id: result.quiz_id,
        user_id: result.user_id,
        score,
        total_questions: questions.length,
        percentage,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);

    return res.status(500).json({
      success: false,
      message: "Could not submit quiz",
    });
  }
});

export default router;
