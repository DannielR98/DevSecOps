import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.delete("/quizzes/:id", checkJwt, async (req, res) => {
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

    // Verify creator
    if (quiz.creator_id !== user.id) {
      return res.status(403).json({ message: "Only the quiz creator can delete this quiz." });
    }

    await quiz.destroy();

    return res.status(200).json({
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
