import { vi } from "vitest";

// Creates a mock function that resolves with a predefined value.
export function createResolvedMock(value) {
  return vi.fn().mockResolvedValue(value);
}

// Creates a mock function that rejects with an Error.
export function createRejectedMock(message = "mock error") {
  return vi.fn().mockRejectedValue(new Error(message));
}

// Creates a mock function that throws synchronously.
export function createThrowMock(message = "mock error") {
  return vi.fn(() => {
    throw new Error(message);
  });
}

// Creates a mock function for destroy-like methods that succeed.
export function createDestroyMock() {
  return vi.fn().mockResolvedValue(undefined);
}

// Creates a mock function for update-like methods that succeed.
export function createUpdateMock(value = [1]) {
  return vi.fn().mockResolvedValue(value);
}