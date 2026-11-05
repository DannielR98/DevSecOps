import bcrypt from "bcryptjs";
import { route, parseWith } from "../lib/http.js";
import { createUserSchema } from "../lib/validation.js";
import { users } from "../lib/repo.js";

export const handler = route(
  async ({ body }) => {
    const { password, ...fields } = parseWith(createUserSchema, body);
    const hashed = password ? await bcrypt.hash(password, 12) : null;

    const user = await users.create({ ...fields, password: hashed });

    return [
      201,
      {
        message: "User registered successfully",
        user: {
          user_id: user.user_id,
          auth_id: user.auth_id,
          firstname: user.firstname,
          surname: user.surname,
          username: user.username,
          email: user.email,
          role_id: user.role_id,
          createdAt: user.createdAt,
        },
      },
    ];
  },
  { auth: false },
);
