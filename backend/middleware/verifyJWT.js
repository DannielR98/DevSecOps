import { Op } from "sequelize";
import checkJwt from "./supabaseAuth.js";
import User from "../models/User.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const verifyJWT = async (req, res, next) => {
  // First, verify the JWT via Supabase (JWKS, HMAC, or Supabase Auth API)
  await checkJwt(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    try {
      const payload = req.user || req.auth?.payload || {};
      const rawId = payload.sub || payload.id || payload.user_id;
      const email = payload.email;

      if (!rawId && !email) {
        return next();
      }

      // Find user by auth_id, user_id (if UUID), or email
      let dbUser = null;
      try {
        const orConditions = [];
        if (rawId) {
          orConditions.push({ auth_id: String(rawId) });
          if (UUID_REGEX.test(String(rawId))) {
            orConditions.push({ user_id: String(rawId) });
          }
        }
        if (email) {
          orConditions.push({ email: { [Op.iLike]: email } });
        }

        if (orConditions.length > 0) {
          dbUser = await User.findOne({
            where: { [Op.or]: orConditions },
          });
        }
      } catch (findErr) {
        console.warn("User lookup in verifyJWT warning:", findErr.message);
      }

      // Auto-provision user in PostgreSQL if authenticated in Supabase but not yet synced
      if (!dbUser && rawId) {
        try {
          const safeUsername = (
            payload.user_metadata?.username ||
            payload.username ||
            email?.split("@")[0] ||
            `user_${String(rawId).slice(0, 8)}`
          ).slice(0, 30);

          dbUser = await User.create({
            auth_id: String(rawId),
            email: email || `${rawId}@example.com`,
            firstname:
              payload.user_metadata?.firstname ||
              payload.user_metadata?.first_name ||
              "User",
            surname:
              payload.user_metadata?.surname ||
              payload.user_metadata?.last_name ||
              "Member",
            username: safeUsername,
          });
        } catch (_createErr) {
          // If creation conflicts with existing record, try lookup again
          try {
            dbUser = await User.findOne({
              where: {
                [Op.or]: [
                  { auth_id: String(rawId) },
                  ...(email ? [{ email }] : []),
                ],
              },
            });
          } catch (_retryErr) {
            // ignore
          }
        }
      }

      if (dbUser) {
        req.user = {
          ...payload,
          id: dbUser.user_id,
          user_id: dbUser.user_id,
          auth_id: dbUser.auth_id,
          email: dbUser.email,
        };
        req.dbUser = dbUser;
      } else {
        req.user = {
          ...payload,
          id: rawId,
          user_id: rawId,
          auth_id: rawId,
          email,
        };
      }

      return next();
    } catch (e) {
      console.error("Error in verifyJWT user resolution:", e);
      return next();
    }
  });
};

export default verifyJWT;
