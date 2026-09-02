import jwt from "jsonwebtoken";

const createJWT = (user) => {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET || "dev_jwt_secret_key_12345",
    {
      expiresIn: "1h",
    },
  );

  return token;
};

export default createJWT;
