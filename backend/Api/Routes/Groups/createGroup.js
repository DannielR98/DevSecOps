import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.post("/groups", verifyJWT, async (req, res) => {
  try {
    const { name } = req.body;

    // Validate input
    if (!name || name.trim() === "") {
      return res.status(400).json({
        sms: ["Please provide group name"],
      });
    }

    // Get owner_id from JWT token
    const ownerId = req.user.id;

    // Create group
    const newGroup = await Group.create({
      name: name.trim(),
      owner_id: ownerId,
    });

    return res.status(201).json({
      group: {
        id: newGroup.id,
        name: newGroup.name,
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
