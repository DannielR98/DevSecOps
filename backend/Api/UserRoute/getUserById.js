/* import express from "express";
import { z } from "zod";
import User from "../../models/User.js";
import checkJwt from "../../middleware/supabaseAuth.js";

const router = express.Router();

const userIdSchema = z.uuid();

router.get("/user/:user_id", checkJwt, async (req, res) => {
  const validation = userIdSchema.safeParse(req.params.user_id);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID. A valid UUID is required.",
    });
  }

  try {
    const user = await User.findOne({
      where: {
        user_id: validation.data,
      },
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

export default router;
 */

import express from "express";
import { z } from "zod";
import User from "../../models/User.js";
import checkJwt from "../../middleware/supabaseAuth.js";

const router = express.Router();

const userIdSchema = z.uuid();

router.get("/user/:user_id", checkJwt, async (req, res) => {
  // Step 1: Validate the requested user ID
  const validation = userIdSchema.safeParse(req.params.user_id);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID. A valid UUID is required.",
    });
  }

  try {
    // Step 2: Get the verified Supabase user ID from JWT
    const authId = req.user?.auth_id;

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user ID not found.",
      });
    }

    // Step 3: Find the authenticated user in your database
    const authenticatedUser = await User.findOne({
      where: {
        auth_id: authId,
      },
      attributes: ["user_id"],
    });

    if (!authenticatedUser) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    // Step 4: Check that the requested profile belongs to this user
    if (String(authenticatedUser.user_id) !== String(validation.data)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this profile.",
      });
    }

    // Step 5: Fetch the authenticated user's profile
    const user = await User.findOne({
      where: {
        user_id: authenticatedUser.user_id,
      },
      attributes: {
        exclude: ["password"],
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Step 6: Return the profile
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile.",
    });
  }
});

export default router;
