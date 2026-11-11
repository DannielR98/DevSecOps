import express from "express";
import bcrypt from "bcrypt";

import User from "../../models/User.js";
import { createUserSchema } from "../../validations/ValidationForSchemas.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  // 1. Validate the incoming request body
  const validation = createUserSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors,
    });
  }

  try {
    // 2. Separate the optional password from other user fields
    const { password, ...otherFields } = validation.data;

    // 3. Hash the password if supplied; otherwise store null
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    // 4. Create the user in the database
    const user = await User.create({
      ...otherFields,
      password: hashedPassword,
    });

    // 5. Return only public user information
    return res.status(201).json({
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
    });
  } catch (error) {
    // 6. Handle duplicate unique fields
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Email, username, or auth_id already exists",
      });
    }

    // 7. Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "User validation failed",
        errors: error.errors.map((item) => item.message),
      });
    }

    // 8. Log unexpected errors on the server
    console.error("Register user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
