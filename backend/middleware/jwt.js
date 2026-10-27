
import jwt from "jsonwebtoken";

const createJWT = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
    },
    secret,
    {
      expiresIn: "1h",
    }
  );
};

export default createJWT;
