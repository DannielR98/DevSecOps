import express from "express";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.get("/groups/:groupId/members/:memberId", checkJwt, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);

    const auth0Id = req.auth.payload.sub;

    const user = await User.findOne({
      where: {
        auth0_id: auth0Id,
      },
    });

    if (!user) {
      return res.status(404).json({
        sms: ["User not found"],
      });
    }

    const currentMember = await GroupMember.findOne({
      where: {
        group_id: groupId,
        user_id: user.id,
      },
    });

    if (!currentMember) {
      return res.status(403).json({
        sms: ["You are not a member of this group"],
      });
    }

    const member = await GroupMember.findOne({
      where: {
        id: memberId,
        group_id: groupId,
      },
      include: [
        {
          model: User,
          attributes: ["id", "firstname", "surname", "username", "email"],
        },
      ],
    });

    if (!member) {
      return res.status(404).json({
        sms: ["Group member not found"],
      });
    }

    return res.status(200).json({
      member,
    });
  } catch (error) {
    console.error("Error getting group member:", error);

    return res.status(500).json({
      sms: ["Could not get group member"],
      error: error.message,
    });
  }
});

export default router;
