import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.post("/quizzes", verifyJWT, async (req, res) => {
  try {
    const { title, groupId } = req.body;

    // Validate input
    if (!title || title.trim() === "") {
      return res.status(400).json({
        sms: ["Please provide quiz title"],
      });
    }

    if (!groupId) {
      return res.status(400).json({
        sms: ["Please provide groupId"],
      });
    }

    // Get user info from JWT token
    const userId = req.user.id;

    // Verify that the user is a member of the group
    const groupMember = await GroupMember.findOne({
      where: {
        userId,
        groupId,
      },
    });

    if (!groupMember) {
      return res.status(403).json({
        sms: ["You are not a member of this group"],
      });
    }

    // Create quiz - the logged in user becomes the owner (createdBy)
    const newQuiz = await Quiz.create({
      title: title.trim(),
      groupId,
      createdBy: userId,
    });

    return res.status(201).json({
      quiz: {
        id: newQuiz.id,
        title: newQuiz.title,
        groupId: newQuiz.groupId,
        createdBy: newQuiz.createdBy,
        createdAt: newQuiz.createdAt,
      },
      sms: ["Quiz created successfully"],
    });
  } catch (error) {
    console.error("Error creating quiz:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
