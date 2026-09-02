import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import Group from "../../../database/schemas/groupSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.post("/quizzes", checkJwt, async (req, res) => {
  try {
    const { title, category, group_id, questions } = req.body;

    if (!title || !group_id || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        message: "Title, group_id, and at least one question are required.",
      });
    }

    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ where: { auth0_id: auth0Id } });

    if (!user) {
      return res.status(404).json({ message: "User not found in local database." });
    }

    // Verify group exists
    const group = await Group.findByPk(group_id);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const newQuiz = await Quiz.create({
      title: title.trim(),
      category: category ? category.trim() : "General",
      group_id,
      creator_id: user.id,
      questions,
    });

    return res.status(201).json({
      message: "Quiz created successfully",
      quiz: newQuiz,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
