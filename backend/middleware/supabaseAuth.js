import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let jwks = null;
let supabaseClient = null;

if (supabaseUrl) {
  try {
    const jwksUrl = new URL("/auth/v1/.well-known/jwks.json", supabaseUrl);
    jwks = createRemoteJWKSet(jwksUrl);
  } catch (e) {
    console.warn("Failed to initialize Supabase JWKS:", e.message);
  }

  if (supabaseAnonKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.warn("Failed to initialize Supabase client:", e.message);
    }
  }
}

const verifySupabaseToken = async (token) => {
  if (jwks) {
    try {
      return (await jwtVerify(token, jwks)).payload;
    } catch (_jwksErr) {
      // Try the configured legacy Supabase secret or Auth API.
    }
  }

  if (process.env.SUPABASE_JWT_SECRET) {
    try {
      return jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ["HS256"] });
    } catch (_hmacErr) {
      // Try the Supabase Auth API.
    }
  }

  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (!error && data?.user) {
      const user = data.user;
      return {
        sub: user.id,
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      };
    }
  }
  return null;
};

const authenticate = (allowNewProfile) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header is required" });
  }
  const token = authHeader.slice(7);
  if (!token) {
    return res.status(401).json({ message: "Invalid authorization header" });
  }

  if (process.env.SUPABASE_JWT_SECRET &&
      process.env.SUPABASE_JWT_SECRET === process.env.JWT_SECRET) {
    console.error("Supabase and application JWT secrets must be different");
    return res.status(500).json({ message: "Authentication configuration error" });
  }

  let payload;
  try {
    payload = await verifySupabaseToken(token);
  } catch (error) {
    console.error("Supabase authentication failed:", error.message);
    return res.status(503).json({ message: "Authentication service unavailable" });
  }
  if (!payload || typeof payload.sub !== "string" || !payload.sub) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findOne({ where: { auth_id: payload.sub } });
    if (user && user.identity_provider !== "supabase") {
      return res.status(403).json({ message: "Existing profile requires identity verification" });
    }
    if (!user && !allowNewProfile) {
      return res.status(401).json({ message: "Authenticated user profile not found" });
    }
    req.auth = { payload };
    req.user = { ...payload, auth_id: payload.sub };
    req.dbUser = user;
    return next();
  } catch (error) {
    console.error("Authenticated profile lookup failed:", error.message);
    return res.status(500).json({ message: "Failed to resolve authenticated user" });
  }
};

export const checkJwt = authenticate(false);
export const checkJwtForSync = authenticate(true);

export default checkJwt;
