import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/groups/:id", verifyJWT, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Find group by id
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        sms: ["Group not found"],
      });
    }

    return res.status(200).json({
      group: {
        id: group.id,
        name: group.name,
        owner_id: group.owner_id,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching group:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
