import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.get("/groups", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all groups where user is owner
    const groups = await Group.findAll({
      where: {
        owner_id: userId,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        owner_id: group.owner_id,
        createdAt: group.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching groups:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
