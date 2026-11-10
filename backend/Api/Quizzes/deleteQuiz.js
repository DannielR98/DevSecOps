/* import express from "express";
import { Op } from "sequelize";

import Quiz from "../../models/Quiz.js";
import QuizResult from "../../models/QuizResult.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.delete("/quizzes/:id", verifyJWT, async (req, res) => {
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

    // 3. Verify that the logged-in user created the quiz
    if (quiz.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the quiz creator can delete this quiz",
      });
    }

    // 4. Delete quiz results and the quiz in a transaction
    await Quiz.sequelize.transaction(async (transaction) => {
      await QuizResult.destroy({
        where: { quiz_id: quiz.id },
        transaction,
      });

      await quiz.destroy({ transaction });
    });

    return res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete quiz",
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
import User from "../../models/User.js";
import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.delete("/quizzes/:id", checkJwt, async (req, res) => {
  try {
    // 1. Get quiz UUID
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID",
      });
    }

    // 2. Get authenticated user information from Supabase JWT
    const authId = req.auth?.payload?.sub;
    const tokenEmail = req.auth?.payload?.email ?? req.user?.email;

    if (!authId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        message: "User information is missing from JWT",
      });
    }

    // 3. Find local user
    let user = null;

    if (authId) {
      user = await User.findOne({
        where: { auth_id: authId },
      });
    }

    // Fallback: find user by email
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

    // 4. Find quiz by UUID
    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // 5. Only the creator can delete the quiz
    if (String(quiz.creator_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the quiz creator can delete this quiz",
      });
    }

    // 6. Delete quiz results and quiz inside one transaction
    await Quiz.sequelize.transaction(async (transaction) => {
      await QuizResult.destroy({
        where: {
          quiz_id: quiz.id,
        },
        transaction,
      });

      await quiz.destroy({
        transaction,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (_error) {
    //console.error("Error deleting quiz:", error);
    // console.error("Database error:", error.original?.message);

    return res.status(500).json({
      success: false,
      message: "Could not delete quiz",
    });
  }
});

export default router;
