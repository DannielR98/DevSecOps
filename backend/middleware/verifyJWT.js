import checkJwt from "./supabaseAuth.js";

const verifyJWT = async (req, res, next) => {
  await checkJwt(req, res, () => {
    const user = req.dbUser;
    req.user = {
      ...req.auth.payload,
      id: user.user_id,
      user_id: user.user_id,
      auth_id: user.auth_id,
      email: user.email,
    };
    return next();
  });
};

export default verifyJWT;
