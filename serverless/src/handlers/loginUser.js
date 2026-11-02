import bcrypt from "bcryptjs";
import { z } from "zod";
import { HttpError, parseWith, publicUser, route } from "../lib/http.js";
import { createJWT } from "../lib/auth.js";
import { users } from "../lib/repo.js";

const loginSchema = z.object({
  user: z.string().trim().min(1, "Username or email is required").max(254),
  password: z.string().min(1, "Password is required"),
});

const invalid = () =>
  new HttpError(401, "Invalid username/email or password");

export const handler = route(
  async ({ body }) => {
    const { user: identifier, password } = parseWith(loginSchema, body);

    const user =
      (await users.byUsername(identifier)) ?? (await users.byEmail(identifier));

    if (!user?.password) throw invalid();

    if (!(await bcrypt.compare(password, user.password))) throw invalid();

    return [
      200,
      {
        success: true,
        message: "Login successful",
        user: publicUser(user),
        token: await createJWT(user),
      },
    ];
  },
  { auth: false },
);
