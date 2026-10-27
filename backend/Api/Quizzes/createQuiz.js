import express from "express";
import { Op } from "sequelize";

import Quiz from "../../models/Quiz.js";
import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";
import { createQuizSchema } from "../../validations/ValidationForSchemas.js";

const router = express.Router();

router.post("/quizzes", verifyJWT, async (req, res) => {
  try {
    // 1. Validate request body using your existing Zod schema
    const validation = createQuizSchema.safeParse(req.body);

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

    const { title, category, group_id, questions } = validation.data;

    // 2. Find the logged-in user
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

    // 3. Check that the group exists
    const group = await Group.findByPk(group_id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // 4. Check that the user belongs to the group
    const membership = await GroupMember.findOne({
      where: {
        group_id: group.id,
        user_id: userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this group to create a quiz",
      });
    }

    // 5. Create the quiz
    const quiz = await Quiz.create({
      title,
      category,
      group_id: group.id,
      creator_id: userId,
      questions,
    });

    return res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quiz,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create quiz",
    });
  }
});

export default router;
