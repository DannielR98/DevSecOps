/* import express from "express";

import Group from "../../models/Group.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/groups/:id", verifyJWT, async (req, res) => {
  try {
    const groupId = req.params.id;

    // Validate the UUID format used by your Group model.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
      });
    }

    // Find the group by its UUID.
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    return res.status(200).json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        invite_code: group.invite_code,
        owner_id: group.owner_id,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching group:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group",
    });
  }
});

export default router;
 */

import express from "express";
import User from "../../models/User.js";
import Group from "../../models/Group.js";
import { checkJwt } from "../../middleware/supabaseAuth.js";

const router = express.Router();

router.get("/groups/:id", checkJwt, async (req, res) => {
  try {
    // 1. Validate group UUID
    const groupId = req.params.id;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
      });
    }

    // 2. Get authenticated user's information from the JWT
    const authId = req.auth?.payload?.sub;

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "User ID is missing from JWT",
      });
    }

    // 3. Find the local user using the Supabase auth ID
    const user = await User.findOne({
      where: { auth_id: authId },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found for this JWT",
      });
    }

    // 4. Find the group
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // 5. Return group details
    return res.status(200).json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        invite_code: group.invite_code,
        owner_id: group.owner_id,
        createdAt: group.createdAt,
      },
    });
  } catch (_error) {
    //console.error("Error fetching group:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group",
    });
  }
});

export default router;
