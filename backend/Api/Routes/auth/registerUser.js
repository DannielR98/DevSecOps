import express from "express";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import User from "../../../database/schemas/userSchema.js";

const router = express.Router();

router.post("/register-user", async (req, res) => {
  try {
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
    const confirmPassword = transformName(req.body.confirmPassword);

    const fields = {
      firstname,
      surname,
      username,
      email,
      password,
      confirmPassword,
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
    if (emptyFields.length === 4) {
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

    // Check password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        sms: ["Password is not correct"],
        emptyFields: ["password", "confirmPassword"],
      });
    }

    // Check if username OR email already exists
    const existUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });

    if (existUser) {
      return res.status(409).json({
        sms: ["User already exists"],
        emptyFields: [],
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      firstname,
      surname,
      username,
      email,
      password: hashedPassword,
    });

    // Return user WITHOUT password
    return res.status(201).json({
      user: {
        firstname,
        surname,
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
      },
      sms: ["User is successfully created"],
      emptyFields: [],
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
