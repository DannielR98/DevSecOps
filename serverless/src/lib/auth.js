import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

import { HttpError } from "./errors.js";
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

// Keep the verified token's source so identities from different issuers cannot
// be used interchangeably, even when their identifiers happen to match.
const verifyIdentity = async (token) => {
  const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
  const appSecret = process.env.JWT_SECRET;
  if (supabaseSecret && supabaseSecret === appSecret) {
    console.error("Supabase and application JWT secrets must be different");
    throw new Error("Supabase and application JWT secrets must be different");
  }

  const keyset = getJwks();
  if (keyset) {
    try {
      return { payload: (await jwtVerify(token, keyset)).payload, source: "supabase" };
    } catch {
      // fall through to shared-secret verification
    }
  }
  for (const [source, secret] of [["supabase", supabaseSecret], ["local", appSecret]]) {
    if (!secret) continue;
    try {
      const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: ["HS256"] });
      return { payload, source };
    } catch {
      // try next secret
    }
  }

  throw new HttpError(401, "Invalid or expired token");
};

export const verifyToken = async (token) => (await verifyIdentity(token)).payload;
// Helper to retrieve a header value case-insensitively.
const header = (event, name) => {
  const headers = event.headers ?? {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
};

// Extracts the bearer token from the Authorization header. Throws an error if the header is missing or malformed.
export const bearerToken = (event) => {
  const auth = header(event, "authorization");
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization header is required");
  }
  return auth.slice(7);
};

const findSupabaseUser = async (subject) => {
  const user = await users.byAuthId(subject);
  if (user && user.identity_provider !== "supabase") {
    throw new HttpError(403, "Existing profile requires identity verification");
  }
  return user;
};

// Create a local profile on first use. On a uniqueness conflict, re-check for
// a concurrently created profile for the same verified Supabase subject.
const provision = async (payload, rawId, email) => {
  const meta = payload.user_metadata ?? {};
  const base = (
    meta.username || payload.username || email?.split("@")[0] || `user_${String(rawId).slice(0, 8)}`
  ).slice(0, 30);
  // Construct the base profile object with required fields.
  const profile = {
    auth_id: String(rawId),
    identity_provider: "supabase",
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
      const existing = await findSupabaseUser(rawId);
      if (existing) return existing;
    }
  }
  throw new HttpError(409, "Unable to provision profile due to a conflicting account");
};

// Verifies the bearer token and returns the matching database user.
export const authenticate = async (event) => {
  // Verify the token and extract the payload.
  const { payload, source } = await verifyIdentity(bearerToken(event));
  const id = source === "supabase" ? payload.sub : payload.user_id;
  if (typeof id !== "string" || !id) {
    throw new HttpError(401, "Invalid authentication token");
  }
  const user = source === "supabase"
    ? (await findSupabaseUser(id)) ?? await provision(payload, id, payload.email)
    : await users.get(id);

  // If no user was found or provisioned, throw an authentication error.
  if (!user) throw new HttpError(401, "User not found for this token");
  return user;
};
