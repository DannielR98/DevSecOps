import { HttpError, route } from "../lib/http.js";
import { groupMembers, groups, quizResults, quizzes } from "../lib/repo.js";

export const handler = route(async ({ params, body, user }) => {
  const { answers } = body;
  if (!Array.isArray(answers)) {
    throw new HttpError(400, "Answers array is required");
  }

  const quiz = await quizzes.get(params.id);
  if (!quiz) throw new HttpError(404, "Quiz not found");

  const group = await groups.get(quiz.group_id);
  if (!group) throw new HttpError(404, "Quiz group not found");

  const isMember = await groupMembers.find(quiz.group_id, user.user_id);
  if (!isMember && group.owner_id !== user.user_id) {
    throw new HttpError(403, "You must be a member of this group to submit the quiz");
  }

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  if (questions.length === 0) throw new HttpError(400, "This quiz has no questions");

  const score = questions.reduce(
    (total, question, index) => total + (answers[index] === question.correctAnswer ? 1 : 0),
    0,
  );

  const result = await quizResults.create({
    quiz_id: quiz.id,
    user_id: user.user_id,
    score,
    total_questions: questions.length,
  });

  return [
    201,
    {
      success: true,
      message: "Quiz submitted successfully",
      result: {
        id: result.id,
        quiz_id: result.quiz_id,
        user_id: result.user_id,
        score,
        total_questions: questions.length,
        percentage: Math.round((score / questions.length) * 100),
        createdAt: result.createdAt,
      },
    },
  ];
});
