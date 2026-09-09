import express from "express";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import Quiz from "../../../database/schemas/quizSchema.js";
import QuizResult from "../../../database/schemas/quizResultSchema.js";
import User from "../../../database/schemas/userSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.delete("/groups/:id", checkJwt, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const auth0Id = req.auth.payload.sub;
    const user = await User.findOne({ where: { auth0_id: auth0Id } });

    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Gruppen hittades inte.",
        sms: ["Group not found"],
      });
    }

    if (!user || group.owner_id !== user.id) {
      return res.status(403).json({
        message: "Du har inte behörighet att ta bort denna grupp.",
        sms: ["You are not the owner of this group"],
      });
    }

    // Find all quizzes associated with this group to delete their results first
    const groupQuizzes = await Quiz.findAll({ where: { group_id: groupId } });
    const quizIds = groupQuizzes.map((q) => q.id);

    if (quizIds.length > 0) {
      await QuizResult.destroy({ where: { quiz_id: quizIds } });
    }

    // Cascade delete associated members and quizzes
    await GroupMember.destroy({ where: { group_id: groupId } });
    await Quiz.destroy({ where: { group_id: groupId } });

    // Delete group
    await group.destroy();

    return res.status(200).json({
      message: "Gruppen har tagits bort.",
      sms: ["Grupp borttagen"],
    });
  } catch (error) {
    console.error("Error deleting group:", error);

    return res.status(500).json({
      message: "Kunde inte ta bort gruppen. Kontrollera kopplade quiz och medlemmar.",
      error: error.message,
    });
  }
});

export default router;

