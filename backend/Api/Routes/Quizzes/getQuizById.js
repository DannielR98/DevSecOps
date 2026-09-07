import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.get("/quizzes/:id", checkJwt, async (req, res) => {
  try {
    const { id } = req.params;

    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ where: { auth0_id: auth0Id } });

    if (!user) {
      return res.status(404).json({ message: "User not found in local database." });
    }

    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    // Verify user is a member of the quiz's group
    const groupMember = await GroupMember.findOne({
      where: {
        user_id: user.id,
        group_id: quiz.group_id,
      },
    });

    if (!groupMember) {
      return res.status(403).json({ message: "You are not a member of this group." });
    }

    return res.status(200).json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        group_id: quiz.group_id,
        creator_id: quiz.creator_id,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching quiz by ID:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
