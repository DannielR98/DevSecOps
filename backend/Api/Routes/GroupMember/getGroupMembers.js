import express from "express";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.get("/groups/:groupId/members", checkJwt, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);

    const members = await GroupMember.findAll({
      where: {
        group_id: groupId,
      },
    });

    return res.status(200).json({
      members,
    });
  } catch (error) {
    console.error("Error getting group members:", error);

    return res.status(500).json({
      sms: ["Could not get group members"],
      error: error.message,
    });
  }
});

export default router;
