import express from "express";
import User from "../../../database/schemas/userSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";

const router = express.Router();

router.delete("/delete-user/:userId", verifyJWT, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user.id !== userId) {
      return res.status(403).json({
        message: "You can only delete your own account",
      });
    }
    const findUser = await User.findByPk(userId);

    if (!findUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    await findUser.destroy();

    return res.status(200).json({
      sms: "User successfully deleted",
      deletedUser: findUser,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
