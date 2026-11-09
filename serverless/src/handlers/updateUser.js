import bcrypt from "bcryptjs";
import { z } from "zod";
import { HttpError, parseWith, publicUser, requireUUID, route } from "../lib/http.js";
import { users } from "../lib/repo.js";

// Schema for validating user profile updates. All fields are optional but at least one must be provided.
const updateUserSchema = z
  .object({
    firstname: z.string().trim().min(1, "First name is required").max(100).optional(),
    surname: z.string().trim().min(1, "Surname is required").max(100).optional(),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .optional(),
    email: z.string().trim().email("Invalid email address").max(254).optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

// Only the authenticated user may update their profile. Hash a supplied
// password before the repository updates the profile and uniqueness locks.
export const handler = route(async ({ params, body, user }) => {
  const id = requireUUID(params.user_id, "Invalid user ID");
  const { password, ...fields } = parseWith(updateUserSchema, body);

  if (user.user_id !== id) {
    throw new HttpError(403, "You are not authorized to update this user");
  }

  if (password !== undefined) {
    fields.password = await bcrypt.hash(password, 12);
  }

  const updated = await users.update(user, fields);

  return [
    200,
    { success: true, message: "User updated successfully", user: publicUser(updated) },
  ];
});
