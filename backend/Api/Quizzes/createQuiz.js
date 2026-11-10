/* import express from "express";
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
 */

import express from "express";
import { Op } from "sequelize";

import Quiz from "../../models/Quiz.js";
import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";

import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.post("/quizzes", checkJwt, async (req, res) => {
  try {
    // 1. Read the request body
    const { title, category, group_id, questions } = req.body;

    console.log("\n========== CREATE QUIZ ==========");
    console.log("Received group_id:", group_id);
    console.log("group_id type:", typeof group_id);
    console.log("Received title:", title);
    console.log("Received category:", category);
    console.log(
      "Received questions:",
      Array.isArray(questions) ? questions.length : "Not an array",
    );

    // 2. Get the authenticated Supabase user
    const authId = req.auth?.payload?.sub;
    const tokenEmail = req.auth?.payload?.email ?? req.user?.email;

    console.log("Supabase auth ID:", authId);
    console.log("Token email:", tokenEmail);

    if (!authId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        code: "AUTH_USER_MISSING",
        message: "User information is missing from JWT",
      });
    }

    // 3. Find the corresponding local database user
    let user = null;

    if (authId) {
      user = await User.findOne({
        where: { auth_id: authId },
      });
    }

    // Fall back to email if auth_id did not match
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
      console.log("Local user not found");

      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found in local database",
      });
    }

    const userId = user.user_id;

    console.log("Local user ID:", userId);

    // 4. Validate required request fields
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        code: "INVALID_TITLE",
        message: "A quiz title is required",
      });
    }

    if (
      group_id === undefined ||
      group_id === null ||
      String(group_id).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        code: "GROUP_ID_MISSING",
        message: "group_id is required",
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        code: "QUESTIONS_REQUIRED",
        message: "At least one question is required",
      });
    }

    // 5. Debug: inspect available groups
    // Change these attribute names if they differ in your Group model.
    let availableGroups = [];

    try {
      availableGroups = await Group.findAll({
        attributes: ["id", "group_id", "name"],
        raw: true,
      });
    } catch (debugError) {
      console.log(
        "Could not list groups with id/group_id/name:",
        debugError.message,
      );
    }

    console.log("Groups in database:", availableGroups);

    // 6. Find the group
    // This assumes the Group model primary key is "id".
    const group = await Group.findByPk(group_id);

    if (!group) {
      console.log("Group not found for group_id:", group_id);

      return res.status(404).json({
        success: false,
        code: "GROUP_NOT_FOUND",
        message: "Group not found",
        receivedGroupId: group_id,
        availableGroups,
      });
    }

    console.log("Found group:", group.toJSON());

    // 7. Verify that the user belongs to the group
    const membership = await GroupMember.findOne({
      where: {
        group_id: group.id,
        user_id: userId,
      },
    });

    if (!membership) {
      console.log("User is not a member of this group");

      return res.status(403).json({
        success: false,
        code: "NOT_GROUP_MEMBER",
        message: "You must be a member of this group to create a quiz",
      });
    }

    // 8. Create the quiz
    const quiz = await Quiz.create({
      title: title.trim(),
      category:
        typeof category === "string" && category.trim()
          ? category.trim()
          : "General",
      group_id: group.id,
      creator_id: userId,
      questions,
    });

    console.log("Quiz created successfully:", quiz.toJSON());
    console.log("================================\n");

    // 9. Return the created quiz
    return res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quiz,
    });
  } catch (error) {
    //console.error("Error creating quiz:", error);
    //console.error("Database error:", error.original?.message);
    //console.error("Database details:", error.errors);

    return res.status(500).json({
      success: false,
      code: "QUIZ_CREATION_FAILED",
      message: "Could not create quiz",
      error: error.message,
    });
  }
});

export default router;
