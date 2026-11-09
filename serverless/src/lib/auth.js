import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

import { HttpError } from "./errors.js";
import { isUUID } from "./http-utils.js";
import { users } from "./repo.js";

const encoder = new TextEncoder();

// Reuse the remote key set across invocations in the same Lambda environment.
// jose fetches and caches public keys from the configured Supabase project.
let jwks;
const getJwks = () => {
  if (!jwks && process.env.SUPABASE_URL) {
    jwks = createRemoteJWKSet(
      new URL("/auth/v1/.well-known/jwks.json", process.env.SUPABASE_URL),
    );
  }
  return jwks;
};

// Application login tokens carry the local user ID and expire after one hour.
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

// Try Supabase's asymmetric public keys first, then the legacy Supabase and
// application HS256 secrets. Only verified payloads are used for identification.
export const verifyToken = async (token) => {
  const keyset = getJwks();
  if (keyset) {
    try {
      return (await jwtVerify(token, keyset)).payload;
    } catch {
      // fall through to shared-secret verification
    }
  }
  // If the remote key set is not available or verification fails, try the shared secrets.
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
// Helper to retrieve a header value case-insensitively.
const header = (event, name) => {
  const headers = event.headers ?? {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
};

// Supabase subject IDs use auth_id; application tokens can carry a local UUID.
// Email is a final lookup fallback if neither identifier finds a profile.
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

// Create a local profile on first use. On a uniqueness conflict, re-check for
// an existing profile (including concurrent creation), then try a suffixed
// username. Defaults fill metadata not present in the verified payload.
const provision = async (payload, rawId, email) => {
  const meta = payload.user_metadata ?? {};
  const base = (
    meta.username || payload.username || email?.split("@")[0] || `user_${String(rawId).slice(0, 8)}`
  ).slice(0, 30);
  // Construct the base profile object with required fields.
  const profile = {
    auth_id: String(rawId),
    email: email || `${rawId}@example.com`,
    firstname: meta.firstname || meta.first_name || "User",
    surname: meta.surname || meta.last_name || "Member",
  };
  // Attempt to create a unique username by trying the base and a suffixed variant.
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
  // Verify the token and extract the payload.
  const payload = await verifyToken(auth.slice(7));
  const rawId = payload.sub || payload.id || payload.user_id;
  const email = payload.email;

  if (!rawId && !email) {
    throw new HttpError(401, "Invalid authentication token");
  }
  // Look up the user by the raw ID or email, or provision a new profile if necessary.
  const user =
    (await findUser(rawId, email)) ?? (rawId ? await provision(payload, rawId, email) : null);

  if (!user) throw new HttpError(401, "User not found for this token");
  return user;
};
