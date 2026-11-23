import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../src/lib/errors.js";

// Control token extraction and verification to isolate the authorizer's error handling.
const mocks = vi.hoisted(() => ({ bearerToken: vi.fn(), verifyToken: vi.fn() }));
vi.mock("../src/lib/auth.js", () => mocks);

const { handler } = await import("../src/handlers/authorize.js");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.bearerToken.mockReturnValue("token");
});

describe("authorizer failure handling", () => {
  // Expected authentication failures deny access without logging token details.
  it("denies expected authentication failures without logging", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.verifyToken.mockRejectedValue(new HttpError(401, "invalid token"));
    await expect(handler({})).resolves.toEqual({ isAuthorized: false });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  // Unexpected failures remain errors, but their potentially sensitive details are not exposed.
  it("rethrows a generic error without leaking unexpected failure details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = Object.assign(new Error("sensitive token or URL"), { detail: "private" });
    mocks.verifyToken.mockRejectedValue(original);
    const failure = await handler({}).catch((error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBe(original);
    expect(failure.message).toBe("Authorizer failed");
    expect(failure.cause).toBeUndefined();
    expect(failure.stack).not.toContain("sensitive token or URL");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
