import express from "express";
import Quiz from "../../../database/schemas/quizSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.get("/quizzes", checkJwt, async (req, res) => {
  try {
    const { group_id } = req.query;

    const whereClause = group_id ? { group_id } : {};

    const quizzes = await Quiz.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ quizzes });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
