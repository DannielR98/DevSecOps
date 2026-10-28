
import express from "express";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";
import { createGroupSchema } from "../../validations/ValidationForSchemas.js";

const router = express.Router();

router.put("/groups/:id", verifyJWT, async (req, res) => {
  try {
    const groupId = req.params.id;

    // Validate UUID group ID.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
      });
    }

    // Validate the group name using your existing Zod schema.
    const validation = createGroupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name } = validation.data;
    const tokenUserId = req.user?.id;
    const tokenEmail = req.user?.email;

    // Find the logged-in database user.
    let user = null;

    if (tokenUserId) {
      user = await User.findByPk(tokenUserId);
    }

    if (!user && tokenEmail) {
      user = await User.findOne({
        where: {
          email: {
            [Op.iLike]: tokenEmail,
          },
        },
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found for this JWT",
      });
    }

    const userId = user.user_id ?? user.id;

    // Find the group.
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only the owner can update the group.
    if (group.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the group owner can edit group details",
      });
    }

    group.name = name;
    await group.save();

    return res.status(200).json({
      success: true,
      message: "Group updated successfully",
      group: {
        id: group.id,
        name: group.name,
        invite_code: group.invite_code,
        owner_id: group.owner_id,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    console.error("Error updating group:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update group",
    });
  }
});

export default router;
