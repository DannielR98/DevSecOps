import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.delete("/groups/:id", verifyJWT, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = req.user.id;

    // Find group by id
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        sms: ["Group not found"],
      });
    }

    // Check if user is the owner
    if (group.owner_id !== userId) {
      return res.status(403).json({
        sms: ["You are not the owner of this group"],
      });
    }

    // Delete group
    await group.destroy();

    return res.status(200).json({
      sms: ["Grupp borttagen"],
    });
  } catch (error) {
    console.error("Error deleting group:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
