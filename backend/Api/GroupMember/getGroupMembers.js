import express from "express";

import Group from "../../models/Group.js";
import GroupMember from "../../models/GroupMember.js";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/groups/:groupId/members", verifyJWT, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Validate UUID format.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
      });
    }

    // Check that the group exists.
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Fetch membership records without a User association.
    const members = await GroupMember.findAll({
      where: { group_id: groupId },
    });

    return res.status(200).json({
      success: true,
      group_id: groupId,
      members,
    });
  } catch (error) {
    console.error("Error getting group members:", error);

    return res.status(500).json({
      success: false,
      message: "Could not get group members",
      error: error.message,
    });
  }
});

export default router;
