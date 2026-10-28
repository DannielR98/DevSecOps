import express from "express";

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
