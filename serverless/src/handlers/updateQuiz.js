import { HttpError, parseWith, route } from "../lib/http.js";
import { createQuizSchema } from "../lib/validation.js";
import { quizzes } from "../lib/repo.js";

// Only the creator may edit. Merge optional fields with existing values before
// validating, while keeping the quiz in its original group.
export const handler = route(async ({ params, body, user }) => {
  const quiz = await quizzes.get(params.id);
  if (!quiz) throw new HttpError(404, "Quiz not found");

  if (quiz.creator_id !== user.user_id) {
    throw new HttpError(403, "Only the quiz creator can update this quiz");
  }

  const { title, category, questions } = parseWith(createQuizSchema, {
    title: body.title ?? quiz.title,
    category: body.category ?? quiz.category,
    group_id: quiz.group_id,
    questions: body.questions ?? quiz.questions,
  });

  const updated = await quizzes.save({ ...quiz, title, category, questions });

  return [200, { success: true, message: "Quiz updated successfully", quiz: updated }];
});
