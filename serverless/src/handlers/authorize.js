import { bearerToken, verifyToken } from "../lib/auth.js";
import { HttpError } from "../lib/errors.js";

// Authorizer handler to check if the request is authorized based on the bearer token.
export const handler = async (event) => {
  // Attempt to verify the bearer token and extract the payload.
  try {
    // Extract the bearer token from the request headers.
    const payload = await verifyToken(bearerToken(event));
    return { isAuthorized: Boolean(payload.sub || payload.id || payload.user_id || payload.email) };
  } catch (error) {
    // If an HttpError with status 401 is thrown, it indicates an unauthorized request.
    if (error instanceof HttpError && error.status === 401) {
      return { isAuthorized: false };
    }
    // The original error may contain credentials; do not attach it as a cause.
    // eslint-disable-next-line preserve-caught-error
    throw new Error("Authorizer failed");
  }
};
