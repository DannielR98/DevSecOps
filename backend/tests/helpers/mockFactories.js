import { vi } from "vitest";

// Creates a mock function that resolves with a predefined value.
// Useful for simulating successful async calls like database reads.
export function createResolvedMock(value) {
  return vi.fn().mockResolvedValue(value);
}

// Creates a mock function that rejects with an Error.
// Useful for simulating async failures like database errors or network issues.
export function createRejectedMock(message = "mock error") {
  return vi.fn().mockRejectedValue(new Error(message));
}

// Creates a mock function that throws synchronously.
// Useful for simulating immediate failures before any async work happens.
export function createThrowMock(message = "mock error") {
  return vi.fn(() => {
    throw new Error(message);
  });
}

// Creates a mock function for destroy-like methods that succeed.
// Useful for Sequelize instance methods such as instance.destroy().
export function createDestroyMock() {
  return vi.fn().mockResolvedValue(undefined);
}

