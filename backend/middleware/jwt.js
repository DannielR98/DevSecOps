import jwt from "jsonwebtoken";

const createJWT = (user) => {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );

  return token;
};

export default createJWT;
