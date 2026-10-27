import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.post("/groups", checkJwt, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        sms: ["Please provide group name"],
      });
    }

    const auth0Id = req.auth.payload.sub;
    let user = await User.findOne({ where: { auth0_id: auth0Id } });

    if (!user) {
      user = await User.create({
        auth0_id: auth0Id,
        email: `${auth0Id}@auth0.user`,
      });
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newGroup = await Group.create({
      name: name.trim(),
      invite_code: inviteCode,
      owner_id: user.id,
    });

    await GroupMember.create({
      group_id: newGroup.id,
      user_id: user.id,
      role: "owner",
    });

    return res.status(201).json({
      group: {
        id: newGroup.id,
        name: newGroup.name,
        invite_code: newGroup.invite_code,
        owner_id: newGroup.owner_id,
      },
      sms: ["Grupp skapad"],
    });
  } catch (error) {
    console.error("Error creating group:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
