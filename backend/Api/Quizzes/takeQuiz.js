/* import express from "express";
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
 */

import express from "express";
import { Op } from "sequelize";
import { validate as isValidUUID } from "uuid";

import Quiz from "../../models/Quiz.js";
import QuizResult from "../../models/QuizResult.js";
import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.post("/quizzes/:id/submit", checkJwt, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;

    // 1. Validate quiz UUID
    if (!isValidUUID(quizId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID",
      });
    }

    // 2. Validate submitted answers
    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers array is required",
      });
    }

    // 3. Get authenticated Supabase user
    const authId = req.auth?.payload?.sub;
    const tokenEmail = req.auth?.payload?.email ?? req.user?.email;

    if (!authId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing from the token",
      });
    }

    // 4. Find local user
    let user = null;

    if (authId) {
      user = await User.findOne({
        where: { auth_id: authId },
      });
    }

    // Fallback to email
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

    const userId = user.user_id;

    if (!userId) {
      return res.status(500).json({
        success: false,
        message: "Local user ID is missing",
      });
    }

    // 5. Find quiz
    const quiz = await Quiz.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // 6. Find quiz group
    if (!quiz.group_id) {
      return res.status(404).json({
        success: false,
        message: "Quiz has no associated group",
      });
    }

    const group = await Group.findByPk(quiz.group_id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Quiz group not found",
      });
    }

    // 7. Check group membership or ownership
    const isOwner = String(group.owner_id) === String(userId);

    let membership = null;

    if (!isOwner) {
      membership = await GroupMember.findOne({
        where: {
          group_id: quiz.group_id,
          user_id: userId,
        },
      });
    }

    if (!membership && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this group to submit the quiz",
      });
    }

    // 8. Validate quiz questions
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This quiz has no questions",
      });
    }

    if (answers.length !== questions.length) {
      return res.status(400).json({
        success: false,
        message: "The number of answers must match the number of questions",
      });
    }

    // Accept text answers and the legacy index representation.
    const normalizedAnswers = [];
    const correctAnswers = [];
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const question = questions[i];

      const options = question.options;
      const answerIndex =
        typeof answer === "string" && Array.isArray(options)
          ? options.indexOf(answer)
          : answer;
      if (
        !Number.isInteger(answerIndex) ||
        !Array.isArray(options) ||
        answerIndex < 0 ||
        answerIndex >= options.length
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid answer for question ${i + 1}`,
        });
      }

      const correctIndex =
        typeof question.correctAnswer === "string"
          ? options.indexOf(question.correctAnswer)
          : question.correctAnswer;
      if (
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= options.length
      ) {
        return res.status(500).json({
          success: false,
          message: `Invalid correct answer configuration for question ${i + 1}`,
        });
      }
      normalizedAnswers.push(answerIndex);
      correctAnswers.push(correctIndex);
    }

    // 10. Calculate score
    let score = 0;

    normalizedAnswers.forEach((answer, index) => {
      if (answer === correctAnswers[index]) {
        score += 1;
      }
    });

    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    // 11. Save result
    const result = await QuizResult.create({
      quiz_id: quiz.id,
      user_id: userId,
      score,
      total_questions: totalQuestions,
    });

    // 12. Return result
    return res.status(201).json({
      success: true,
      message: "Quiz submitted successfully",
      result: {
        id: result.id,
        quiz_id: result.quiz_id,
        user_id: result.user_id,
        score,
        total_questions: totalQuestions,
        percentage,
        createdAt: result.createdAt,
      },
    });
  } catch (_error) {
    //console.error("Error submitting quiz:", error);
    //console.error("Database error:", error.original?.message);

    return res.status(500).json({
      success: false,
      message: "Could not submit quiz",
    });
  }
});

export default router;
