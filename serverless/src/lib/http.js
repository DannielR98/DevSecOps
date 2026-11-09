import { HttpError } from "./errors.js";
import { authenticate } from "./auth.js";
import { isUUID, requireUUID } from "./http-utils.js";

export { HttpError, isUUID, requireUUID };

export const respond = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// API Gateway may send base64-encoded bodies. Endpoints expect JSON objects;
// malformed JSON, arrays and primitive values are rejected before the handler.
const parseBody = (event) => {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed;
  } catch {
    throw new HttpError(400, "Request body must be a JSON object");
  }
};

// Validate with a zod schema, producing the same error shape the API used before.
export const parseWith = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, "Validation failed", {
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }
  return result.data;
};

// Strip the stored password before serializing a user profile.
export const publicUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

/**
 * Wraps a handler body: parses the request, authenticates (unless auth is
 * false) and converts thrown HttpErrors into JSON responses.
 * The body function receives { params, query, body, user } and returns
 * [statusCode, jsonBody]. OPTIONS exits before body parsing and authentication;
 * deployed CORS headers are configured on the API Gateway HTTP API.
 */

export const route =
  (fn, { auth = true } = {}) =>
    async (event) => {
      if (
        event.requestContext?.http?.method === "OPTIONS" ||
        event.httpMethod === "OPTIONS"
      ) {
        return {
          statusCode: 204,
          body: "",
        };
      }
      try {
        const ctx = {
          params: event.pathParameters ?? {},
          query: event.queryStringParameters ?? {},
          body: parseBody(event),
          user: null,
        };
        // Authenticate the user if required.
        if (auth) {
          ctx.user = await authenticate(event);
        }
        // Call the handler with the constructed context.
        const [status, body] = await fn(ctx);
        return respond(status, body);
      } catch (error) {
        if (error instanceof HttpError) {
          return respond(error.status, {
            success: false,
            message: error.message,
            ...error.extra,
          });
        }
        // Log unexpected details on the server without exposing them to clients.
        console.error("Unhandled error:", error);
        return respond(500, { success: false, message: "Internal server error" });
      }
    };