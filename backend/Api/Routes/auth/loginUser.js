import express from "express";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import User from "../../../database/schemas/userSchema.js";
import createJWT from "../../../middleware/jwt.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const transformName = (name, toLower = false) => {
      if (typeof name !== "string") {
        return "";
      }

      return toLower ? name.trim().toLowerCase() : name.trim();
    };

    const username = transformName(req.body.username, true);
    const password = transformName(req.body.password);

    const fields = {
      username,
      password,
    };

    let sms = [];
    let emptyFields = [];

    // Check empty fields
    for (const [fieldName, value] of Object.entries(fields)) {
      if (!value) {
        sms.push(`Please fill ${fieldName}`);
        emptyFields.push(fieldName);
      }
    }

    // All fields are empty
    if (emptyFields.length === 2) {
      return res.status(400).json({
        sms: ["Please fill all fields"],
        emptyFields: Object.keys(fields),
      });
    }

    // Some fields are empty
    if (emptyFields.length > 0) {
      return res.status(400).json({
        sms,
        emptyFields,
      });
    }

    // Find user by username OR email
    const existUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
      },
    });

    // User does not exist
    if (!existUser) {
      return res.status(404).json({
        sms: [
          "Username or Email is not correct Or User does not exist, please register",
        ],
        emptyFields: ["username"],
      });
    }

    // Compare password with hashed password
    const passwordCorrect = await bcrypt.compare(password, existUser.password);

    if (!passwordCorrect) {
      return res.status(401).json({
        sms: ["Password is not correct"],
        emptyFields: ["password"],
      });
    }
    const user = {
      id: existUser.id,
      firstname: existUser.firstname,
      surname: existUser.surname,
      username: existUser.username,
      email: existUser.email,
      password: existUser.password,
    };
    const token = createJWT(user);

    return res.status(200).json({
      user,
      sms: ["User successfully logged in"],
      emptyFields: [],
      token,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
