import { HttpError, route } from "../lib/http.js";
import { quizzes } from "../lib/repo.js";

// Deletion is restricted to the creator and also removes stored quiz results.
export const handler = route(async ({ params, user }) => {
  const quiz = await quizzes.get(params.id);
  if (!quiz) throw new HttpError(404, "Quiz not found");

  // Only the creator may delete the quiz.
  if (quiz.creator_id !== user.user_id) {
    throw new HttpError(403, "Only the quiz creator can delete this quiz");
  }

  await quizzes.removeCascade(quiz);

  return [200, { success: true, message: "Quiz deleted successfully" }];
});
