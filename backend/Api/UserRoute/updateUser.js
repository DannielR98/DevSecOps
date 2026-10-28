import express from "express";
import { z } from "zod";
import bcrypt from "bcrypt";

import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

// 1. Validate fields allowed for profile updates
const updateUserSchema = z
  .object({
    firstname: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(100)
      .optional(),

    surname: z
      .string()
      .trim()
      .min(1, "Surname is required")
      .max(100)
      .optional(),

    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .optional(),

    email: z.string().trim().email("Invalid email address").max(254).optional(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

// 2. Update a user
// PUT /update-user/:user_id
router.put("/update-user/:user_id", verifyJWT, async (req, res) => {
  try {
    // Validate user ID in URL
    const idValidation = z.string().uuid().safeParse(req.params.user_id);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Validate request body
    const validation = updateUserSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
      });
    }

    // Get authenticated user ID from verified JWT
    const authenticatedUserId = req.user?.user_id ?? req.user?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // Users may update only their own profile
    if (authenticatedUserId !== idValidation.data) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this user",
      });
    }

    // Find user in database
    const user = await User.findByPk(idValidation.data);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prepare validated update data
    const { password, ...profileFields } = validation.data;

    // Hash password if supplied
    if (password !== undefined) {
      profileFields.password = await bcrypt.hash(password, 12);
    }

    // Update only permitted fields
    await user.update(profileFields);

    // Remove sensitive fields from response
    const userData = user.toJSON();

    delete userData.password;
    delete userData.passwordHash;
    delete userData.password_hash;

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: userData,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Email or username already exists",
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "User validation failed",
        errors: error.errors.map((item) => item.message),
      });
    }

    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
});

export default router;
