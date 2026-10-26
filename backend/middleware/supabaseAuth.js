import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const checkJwt = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header is required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Invalid authorization header" });
    }

    const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    // Provide both req.auth.payload and req.user so all controllers remain compatible
    req.auth = { payload: decoded };
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

export default checkJwt;
