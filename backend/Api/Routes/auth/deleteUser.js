import express from "express";
import User from "../../../database/schemas/userSchema.js";
import Group from "../../../database/schemas/groupSchema.js";
import GroupMember from "../../../database/schemas/groupMemberSchema.js";
import { checkJwt } from "../../../middleware/auth0.js";

const router = express.Router();

router.delete("/delete-user/:userId", checkJwt, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        sms: ["Invalid user ID"],
      });
    }

    const auth0Id = req.auth.payload.sub;

    const findUser = await User.findOne({
      where: {
        auth0_id: auth0Id,
      },
    });

    if (!findUser) {
      return res.status(404).json({
        sms: ["User not found"],
      });
    }

    if (findUser.id !== userId) {
      return res.status(403).json({
        sms: ["You can only delete your own account"],
      });
    }

    // 1. Find groups owned by this user
    const ownedGroups = await Group.findAll({
      where: {
        owner_id: findUser.id,
      },
    });

    // 2. Delete memberships inside owned groups
    for (const group of ownedGroups) {
      await GroupMember.destroy({
        where: {
          group_id: group.id,
        },
      });
    }

    // 3. Delete user's memberships in other groups
    await GroupMember.destroy({
      where: {
        user_id: findUser.id,
      },
    });

    // 4. Delete groups owned by the user
    for (const group of ownedGroups) {
      await group.destroy();
    }

    // 5. Finally delete the user
    await findUser.destroy();

    return res.status(200).json({
      sms: ["User successfully deleted"],
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
