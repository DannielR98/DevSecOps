import { HttpError, requireUUID, route } from "../lib/http.js";
import { groupMembers, groups, quizResults, quizzes, users } from "../lib/repo.js";

export const handler = route(async ({ params, query, user }) => {
  const quizId = requireUUID(params.id, "Invalid quiz ID");
  if (query.view !== "mine" && query.view !== "leaderboard") {
    throw new HttpError(400, "View must be mine or leaderboard");
  }
  const quiz = await quizzes.get(quizId);
  if (!quiz) throw new HttpError(404, "Quiz not found");
  const group = await groups.get(quiz.group_id);
  if (!group) throw new HttpError(404, "Quiz group not found");
  if (group.owner_id !== user.user_id && !(await groupMembers.find(group.id, user.user_id))) {
    throw new HttpError(403, "You are not a member of this group");
  }

  const results = await quizResults.listByQuiz(quizId);
  if (query.view === "mine") {
    return [200, {
      results: results.filter((result) => result.user_id === user.user_id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        .map(({ id, score, total_questions, createdAt }) => ({
          id, score, total_questions, createdAt,
          percentage: Math.round(score / total_questions * 100),
        })),
    }];
  }

  const best = new Map();
  const attempts = new Map();
  for (const result of results) {
    attempts.set(result.user_id, (attempts.get(result.user_id) ?? 0) + 1);
    const previous = best.get(result.user_id);
    const comparison = previous ? result.score * previous.total_questions - previous.score * result.total_questions : 1;
    if (!previous || comparison > 0 || (comparison === 0 &&
      (result.createdAt.localeCompare(previous.createdAt) || result.id.localeCompare(previous.id)) < 0)) {
      best.set(result.user_id, result);
    }
  }
  const profiles = await users.getMany([...best.keys()]);
  const names = new Map(profiles.map((profile) => [profile.user_id, profile.username]));
  return [200, {
    results: [...best.values()].map(({ user_id, score, total_questions }) => ({
      user_id, username: names.get(user_id) ?? "Borttagen användare", score, total_questions,
      attempt_count: attempts.get(user_id),
      percentage: Math.round(score / total_questions * 100),
    })).sort((a, b) => b.score * a.total_questions - a.score * b.total_questions ||
      a.username.localeCompare(b.username) || a.user_id.localeCompare(b.user_id)),
  }];
});
