import { HttpError, route } from "../lib/http.js";
import { groupMembers, groups, quizzes } from "../lib/repo.js";

// Require group membership or ownership before returning quiz details.
export const handler = route(async ({ params, user }) => {
  const quiz = await quizzes.get(params.id);
  if (!quiz) throw new HttpError(404, "Quiz not found");

  // Ensure the quiz belongs to an existing group before checking membership.
  const group = await groups.get(quiz.group_id);
  if (!group) throw new HttpError(404, "Quiz group not found");

  // Ensure the user is either a member of the group or the group owner.
  const isMember = await groupMembers.find(quiz.group_id, user.user_id);
  if (!isMember && group.owner_id !== user.user_id) {
    throw new HttpError(403, "You are not a member of this group");
  }

  return [
    200,
    {
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        group_id: quiz.group_id,
        creator_id: quiz.creator_id,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
      },
    },
  ];
});
