import { bearerToken, verifyToken } from "../lib/auth.js";
import { HttpError } from "../lib/errors.js";

export const handler = async (event) => {
  try {
    const payload = await verifyToken(bearerToken(event));
    return { isAuthorized: Boolean(payload.sub || payload.id || payload.user_id || payload.email) };
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      return { isAuthorized: false };
    }
    console.error("Authorizer error:", error);
    throw error;
  }
};
