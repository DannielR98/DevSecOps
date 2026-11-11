import express from "express";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { z } from "zod";

import User from "../../models/User.js";
import createJWT from "../../middleware/jwt.js";

const router = express.Router();

const loginSchema = z.object({
  user: z
    .string()
    .trim()
    .min(1, "Username or email is required")
    .max(254, "Username or email is too long"),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", async (req, res) => {
  try {
    // 1. Validate request body
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    // 2. Extract credentials
    const { user: identifier, password } = validation.data;

    // 3. Find by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: identifier },
          { email: identifier.toLowerCase() },
        ],
      },
    });

    // 4. Check user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    // 5. Check password is configured
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    // 6. Compare password with stored bcrypt hash
    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    // 7. Generate JWT
    const token = createJWT(user);

    // 8. Return user details without password
    const userData = user.toJSON();
    delete userData.password;
    delete userData.passwordHash;
    delete userData.password_hash;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed due to a server error",
    });
  }
});

export default router;
