import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/supabaseAuth.js";

const router = express.Router();

router.put("/groups/:id", checkJwt, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Group name is required." });
    }

    const supabaseId = req.auth.payload.sub;
    const user = await User.findOne({ where: { supabase_id: supabaseId } });

    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!user || group.owner_id !== user.id) {
      return res.status(403).json({ message: "Only group owner can edit group details." });
    }

    group.name = name.trim();
    await group.save();

    return res.status(200).json({
      message: "Group updated successfully",
      group,
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
