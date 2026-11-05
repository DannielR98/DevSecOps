import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

import { HttpError } from "./errors.js";
import { isUUID } from "./http-utils.js";
import { users } from "./repo.js";

const encoder = new TextEncoder();

let jwks;
const getJwks = () => {
  if (!jwks && process.env.SUPABASE_URL) {
    jwks = createRemoteJWKSet(
      new URL("/auth/v1/.well-known/jwks.json", process.env.SUPABASE_URL),
    );
  }
  return jwks;
};

export const createJWT = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");

  return new SignJWT({
    user_id: user.user_id,
    username: user.username,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(encoder.encode(secret));
};

// Accepts Supabase tokens (JWKS or HS256 secret) and tokens issued by /login.
export const verifyToken = async (token) => {
  const keyset = getJwks();
  if (keyset) {
    try {
      return (await jwtVerify(token, keyset)).payload;
    } catch {
      // fall through to shared-secret verification
    }
  }

  for (const secret of [process.env.SUPABASE_JWT_SECRET, process.env.JWT_SECRET]) {
    if (!secret) continue;
    try {
      return (await jwtVerify(token, encoder.encode(secret), { algorithms: ["HS256"] }))
        .payload;
    } catch {
      // try next secret
    }
  }

  throw new HttpError(401, "Invalid or expired token");
};

const header = (event, name) => {
  const headers = event.headers ?? {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
};

const findUser = async (rawId, email) => {
  if (rawId) {
    const byAuth = await users.byAuthId(String(rawId));
    if (byAuth) return byAuth;
    if (isUUID(String(rawId))) {
      const byId = await users.get(String(rawId));
      if (byId) return byId;
    }
  }
  return email ? users.byEmail(email) : null;
};

// Creates the local profile for a user authenticated by Supabase on first use.
const provision = async (payload, rawId, email) => {
  const meta = payload.user_metadata ?? {};
  const base = (
    meta.username || payload.username || email?.split("@")[0] || `user_${String(rawId).slice(0, 8)}`
  ).slice(0, 30);

  const profile = {
    auth_id: String(rawId),
    email: email || `${rawId}@example.com`,
    firstname: meta.firstname || meta.first_name || "User",
    surname: meta.surname || meta.last_name || "Member",
  };

  const candidates = [base, `${base.slice(0, 21)}_${String(rawId).slice(0, 8)}`];
  for (const username of candidates) {
    try {
      return await users.create({ ...profile, username });
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 409) throw error;
      const existing = await findUser(rawId, email);
      if (existing) return existing;
    }
  }
  return null;
};

/** Verifies the bearer token and returns the matching database user. */
export const authenticate = async (event) => {
  const auth = header(event, "authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization header is required");
  }

  const payload = await verifyToken(auth.slice(7));
  const rawId = payload.sub || payload.id || payload.user_id;
  const email = payload.email;

  if (!rawId && !email) {
    throw new HttpError(401, "Invalid authentication token");
  }

  const user =
    (await findUser(rawId, email)) ?? (rawId ? await provision(payload, rawId, email) : null);

  if (!user) throw new HttpError(401, "User not found for this token");
  return user;
};
