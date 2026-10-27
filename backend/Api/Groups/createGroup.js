import express from "express";
import { randomBytes } from "node:crypto";
import { Op } from "sequelize";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import User from "../../models/User.js";
import verifyJWT from "../../middleware/verifyJWT.js";
import { createGroupSchema } from "../../validations/ValidationForSchemas.js";

const router = express.Router();

router.post("/groups", verifyJWT, async (req, res) => {
  // 1. Validate request body
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

  try {
    const { name } = validation.data;

    // 2. Get claims from your existing JWT
    const tokenUserId = req.user?.id;
    const tokenEmail = req.user?.email;

    if (!tokenUserId && !tokenEmail) {
      return res.status(401).json({
        success: false,
        message: "JWT does not contain a user ID or email",
      });
    }

    // 3. Find the registered user
    let user = null;

    if (tokenUserId) {
      user = await User.findByPk(tokenUserId);
    }

    // Fallback if the JWT ID is not the database primary key
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
      return res.status(404).json({
        success: false,
        message:
          "User not found. Register the user first or check the JWT identity.",
      });
    }

    // Use the actual primary key returned by Sequelize
    const databaseUserId = user.user_id ?? user.id;

    if (!databaseUserId) {
      return res.status(500).json({
        success: false,
        message: "The User model does not expose a recognized primary key",
      });
    }

    // 4. Create group and owner membership in one transaction
    const newGroup = await Group.sequelize.transaction(async (transaction) => {
      let inviteCode;
      let existingGroup;
      let attempts = 0;

      do {
        inviteCode = randomBytes(5).toString("hex").toUpperCase();

        existingGroup = await Group.findOne({
          where: { invite_code: inviteCode },
          transaction,
        });

        attempts++;

        if (attempts >= 5 && existingGroup) {
          throw new Error("Could not generate a unique invite code");
        }
      } while (existingGroup);

      const group = await Group.create(
        {
          name,
          invite_code: inviteCode,
          owner_id: databaseUserId,
        },
        { transaction },
      );

      await GroupMember.create(
        {
          group_id: group.id,
          user_id: databaseUserId,
          role: "owner",
        },
        { transaction },
      );

      return group;
    });

    // 5. Return successful response
    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: {
        id: newGroup.id,
        name: newGroup.name,
        invite_code: newGroup.invite_code,
        owner_id: newGroup.owner_id,
        createdAt: newGroup.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating group:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A group with conflicting unique data already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create group",
    });
  }
});

export default router;
