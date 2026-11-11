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

router.get("/quizzes/:id/results", checkJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const { view } = req.query;
    if (!isValidUUID(id)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }
    if (view !== "mine" && view !== "leaderboard") {
      return res
        .status(400)
        .json({ message: "View must be mine or leaderboard" });
    }

    const authId = req.auth?.payload?.sub;
    const email = req.auth?.payload?.email ?? req.user?.email;
    let user = authId
      ? await User.findOne({ where: { auth_id: authId } })
      : null;
    if (!user && email) {
      user = await User.findOne({ where: { email: { [Op.iLike]: email } } });
    }
    if (!user) {
      return res.status(401).json({ message: "User not found for this JWT" });
    }

    const quiz = await Quiz.findByPk(id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    const group = await Group.findByPk(quiz.group_id);
    if (!group) {
      return res.status(404).json({ message: "Quiz group not found" });
    }
    const isOwner = String(group.owner_id) === String(user.user_id);
    const membership = isOwner
      ? null
      : await GroupMember.findOne({
        where: { group_id: quiz.group_id, user_id: user.user_id },
      });
    if (!isOwner && !membership) {
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }

    const where =
      view === "mine"
        ? { quiz_id: id, user_id: user.user_id }
        : { quiz_id: id };
    const results = await QuizResult.findAll({ where, raw: true });
    if (view === "mine") {
      return res.json({
        results: results
          .sort(
            (a, b) =>
              new Date(a.createdAt) - new Date(b.createdAt) ||
              a.id.localeCompare(b.id),
          )
          .map(({ id: resultId, score, total_questions, createdAt }) => ({
            id: resultId,
            score,
            total_questions,
            createdAt,
            percentage: Math.round((score / total_questions) * 100),
          })),
      });
    }

    const best = new Map();
    const attempts = new Map();
    for (const result of results) {
      attempts.set(result.user_id, (attempts.get(result.user_id) ?? 0) + 1);
      const previous = best.get(result.user_id);
      const comparison = previous
        ? result.score * previous.total_questions -
          previous.score * result.total_questions
        : 1;
      if (
        !previous ||
        comparison > 0 ||
        (comparison === 0 &&
          (new Date(result.createdAt) - new Date(previous.createdAt) ||
            result.id.localeCompare(previous.id)) < 0)
      ) {
        best.set(result.user_id, result);
      }
    }
    const profiles = best.size
      ? await User.findAll({
        where: { user_id: { [Op.in]: [...best.keys()] } },
        attributes: ["user_id", "username"],
        raw: true,
      })
      : [];
    const names = new Map(
      profiles.map((profile) => [profile.user_id, profile.username]),
    );
    return res.json({
      results: [...best.values()]
        .map(({ user_id, score, total_questions }) => ({
          user_id,
          username: names.get(user_id) ?? "Borttagen användare",
          score,
          total_questions,
          attempt_count: attempts.get(user_id),
          percentage: Math.round((score / total_questions) * 100),
        }))
        .sort(
          (a, b) =>
            b.score * a.total_questions - a.score * b.total_questions ||
            a.username.localeCompare(b.username) ||
            a.user_id.localeCompare(b.user_id),
        ),
    });
  } catch (error) {
    console.error("Error fetching quiz results:", error.message);
    return res.status(500).json({ message: "Could not fetch quiz results" });
  }
});

export default router;
