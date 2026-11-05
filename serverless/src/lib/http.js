import { HttpError } from "./errors.js";
import { authenticate } from "./auth.js";
import { isUUID, requireUUID } from "./http-utils.js";

export { HttpError, isUUID, requireUUID };

/* export const respond = (status, body) => ({
  
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
}); */

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};
 export const respond = (status, body) => ({
  
  statusCode: status,
  headers: { "Content-Type": "application/json", ...corsHeaders },
  body: JSON.stringify(body),
});

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

export const publicUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

/**
 * Wraps a handler body: parses the request, authenticates (unless auth is
 * false) and converts thrown HttpErrors into JSON responses.
 * The body function receives { params, query, body, user } and returns
 * [statusCode, jsonBody].
 */
/* export const route =
  (fn, { auth = true } = {}) =>
  async (event) => {
    try {
      const ctx = {
        params: event.pathParameters ?? {},
        query: event.queryStringParameters ?? {},
        body: parseBody(event),
        user: null,
      };

      if (auth) {
        ctx.user = await authenticate(event);
      }

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
      console.error("Unhandled error:", error);
      return respond(500, { success: false, message: "Internal server error" });
    }
  }; */
export const route =
  (fn, { auth = true } = {}) =>
  async (event) => {
     if (
      event.requestContext?.http?.method === "OPTIONS" ||
      event.httpMethod === "OPTIONS"
    ) {
      return {
        statusCode: 204,
        headers: corsHeaders,
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

      if (auth) {
        ctx.user = await authenticate(event);
      }

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
      console.error("Unhandled error:", error);
      return respond(500, { success: false, message: "Internal server error" });
    }
  };