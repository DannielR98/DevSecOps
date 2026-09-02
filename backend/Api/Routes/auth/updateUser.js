import express from "express";
import User from "../../../database/schemas/userSchema.js";
import verifyJWT from "../../../middleware/verifyJWT.js";
import bcrypt from "bcrypt";
import { Op } from "sequelize";

const router = express.Router();

router.put("/update-user/:userId", verifyJWT, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    let sms = [];
    let emptyFields = [];

    const transformName = (name, toLower = false) => {
      if (typeof name !== "string") {
        return "";
      }

      return toLower ? name.trim().toLowerCase() : name.trim();
    };

    const firstname = transformName(req.body.firstname, true);
    const surname = transformName(req.body.surname, true);
    const username = transformName(req.body.username, true);
    const email = transformName(req.body.email, true);
    const password = transformName(req.body.password);

    const fields = {
      firstname,
      surname,
      username,
      email,
      password,
    };

    // User can only update their own account
    if (req.user.id !== userId) {
      return res.status(403).json({
        sms: ["You can only update your own account"],
      });
    }

    const findUser = await User.findByPk(userId);

    if (!findUser) {
      return res.status(404).json({
        sms: ["User not found"],
      });
    }
    // Check username and email
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username: username }, { email: email }],
        id: { [Op.ne]: userId },
      },
    });
    if (existingUser) {
      if (existingUser.username === username) {
        sms.push("Username is already exist. Please try another username.");
      }
      if (existingUser.email === email) {
        sms.push("Email is already exist. Please try another email.");
      }
      return res.status(409).json({ sms });
    }
    //const hashedPassword = await bcrypt.hash(password, 10);

    const updated = {
      firstname,
      surname,
      username,
      email,
    };

    if (password) {
      updated.password = await bcrypt.hash(password, 10);
    }
    await User.update(updated, {
      where: {
        id: userId,
      },
    });

    const updatedUser = await User.findByPk(userId);

    return res.status(200).json({
      sms: ["User successfully updated"],
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Something went wrong",
    });
  }
});

export default router;
