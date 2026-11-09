import { HttpError } from "./errors.js";

// Check the textual UUID shape, without restricting a particular UUID version.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUUID = (value) =>
  typeof value === "string" && UUID_REGEX.test(value);

// Endpoints supply their own message while sharing the same 400 response.
export const requireUUID = (value, message) => {
  if (!isUUID(value)) throw new HttpError(400, message);
  return value;
};
