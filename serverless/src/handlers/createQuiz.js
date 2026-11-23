import { HttpError, parseWith, route } from "../lib/http.js";
import { createQuizSchema } from "../lib/validation.js";
import { groupMembers, groups, quizzes } from "../lib/repo.js";

// Only members can create quizzes; the authenticated user becomes the creator.
// Questions include the correct answer text, validated against the options.
export const handler = route(async ({ body, user }) => {
  const { title, category, group_id, questions } = parseWith(createQuizSchema, body);

  const group = await groups.get(group_id);
  if (!group) throw new HttpError(404, "Group not found");

  // Only the group members can create quizzes.
  if (!(await groupMembers.find(group.id, user.user_id))) {
    throw new HttpError(403, "You must be a member of this group to create a quiz");
  }

  const quiz = await quizzes.create({
    title,
    category,
    group_id: group.id,
    creator_id: user.user_id,
    questions,
  });

  return [201, { success: true, message: "Quiz created successfully", quiz }];
});
