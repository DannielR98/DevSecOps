/* import express from "express";
import { Op } from "sequelize";
import Quiz from "../../models/Quiz.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";
import { createQuizSchema } from "../../validations/ValidationForSchemas.js";

const router = express.Router();

router.put("/quizzes/:id", verifyJWT, async (req, res) => {
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

    // 3. Verify the logged-in user is the quiz creator
    if (quiz.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the quiz creator can update this quiz",
      });
    }

    // 4. Validate the request body
    const validation = createQuizSchema.safeParse({
      title: req.body.title ?? quiz.title,
      category: req.body.category ?? quiz.category,
      group_id: quiz.group_id,
      questions: req.body.questions ?? quiz.questions,
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { title, category, questions } = validation.data;

    // 5. Update the quiz
    await quiz.update({
      title,
      category,
      questions,
    });

    return res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      quiz,
    });
  } catch (error) {
    console.error("Error updating quiz:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update quiz",
    });
  }
});

export default router;
 */

import express from "express";
import { Op } from "sequelize";
import { validate as isValidUUID } from "uuid";

import Quiz from "../../models/Quiz.js";
import User from "../../models/User.js";
import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.put("/quizzes/:id", checkJwt, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate quiz UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID",
      });
    }

    // 2. Get authenticated Supabase user
    const authId = req.auth?.payload?.sub;
    const tokenEmail = req.auth?.payload?.email ?? req.user?.email;

    if (!authId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user information is missing from the token",
      });
    }

    // 3. Find local user
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

    // 4. Find quiz
    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // 5. Only quiz creator can update
    if (String(quiz.creator_id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the quiz creator can update this quiz",
      });
    }

    // 6. Get updated values
    const { title, category, questions } = req.body;

    // 7. Update only supplied fields
    const updateData = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (questions !== undefined) {
      updateData.questions = questions;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update",
      });
    }

    // 8. Update quiz
    await quiz.update(updateData);

    // 9. Return updated quiz
    return res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      quiz: quiz.get({ plain: true }),
    });
  } catch (error) {
    console.error("Error updating quiz:", error.message);
    //console.error("Database error:", error.original?.message);

    return res.status(500).json({
      success: false,
      message: "Could not update quiz",
      error: error.message,
    });
  }
});

export default router;
