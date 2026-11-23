/* import express from "express";
import { z } from "zod";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.delete("/delete-user/:user_id", verifyJWT, async (req, res) => {
  try {
    // Validate the user ID in the URL
    const idValidation = z.string().uuid().safeParse(req.params.user_id);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Get the authenticated user's ID from the JWT
    const authenticatedUserId = req.user?.user_id;

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // Users may delete only their own accounts
    if (authenticatedUserId !== idValidation.data) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this user",
      });
    }

    // Find the user
    const user = await User.findByPk(idValidation.data);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete the user
    await user.destroy();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

export default router; */

import express from "express";
import { z } from "zod";
import User from "../../models/User.js";
import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

const userIdSchema = z.uuid();

router.delete("/delete-user/:user_id", checkJwt, async (req, res) => {
  try {
    // 1. Validate requested user ID
    const validation = userIdSchema.safeParse(req.params.user_id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // 2. Get authenticated Supabase user ID
    const authId = req.user?.auth_id || req.user?.sub;

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // 3. Find the requested account by its local UUID
    const requestedUser = await User.findByPk(validation.data);

    if (!requestedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 4. Check whether this account belongs to the authenticated user
    if (String(requestedUser.auth_id) !== String(authId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this user",
      });
    }

    // 5. Delete the account
    await requestedUser.destroy();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

export default router;
